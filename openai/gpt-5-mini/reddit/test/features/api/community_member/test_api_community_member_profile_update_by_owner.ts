import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_community_member_profile_update_by_owner(
  connection: api.IConnection,
) {
  // 1) Register a fresh community member (owner)
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerUsername = `testuser_${RandomGenerator.alphaNumeric(8)}`;
  const joinBody = {
    email: ownerEmail,
    username: ownerUsername,
    password: "Passw0rd!",
    profile: undefined,
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const auth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(auth);

  // Extract username (canonical) for later path usage
  const username: string = auth.member.username;

  // 2) Create a community using the owner's authenticated connection
  const communitySlug = `test-community-${Date.now()}`;
  const communityBody = {
    name: RandomGenerator.name(2),
    slug: communitySlug,
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    }),
    visibility: "public",
    post_approval_required: false,
  } satisfies ICommunityBbsCommunity.ICreate;

  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "created community slug matches",
    community.slug,
    communitySlug,
  );

  // 3) Create a sample post inside the community
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    post_type: "text",
  } satisfies ICommunityBbsPost.ICreate;

  const post: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals(
    "post belongs to community",
    post.community.slug,
    community.slug,
  );

  // 4) Upload an avatar/media item referencing the created post
  const mediaUrl = typia.random<string & tags.Format<"uri">>();
  const uploadBody = {
    upload_mode: "url",
    url: mediaUrl,
    media_type: "image/png",
    size_bytes: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<100000>
    >(),
    ordering: 0,
    community_bbs_post_id: post.id,
  } satisfies ICommunityBbsPostMedia.ICreate;

  const media: ICommunityBbsPostMedia =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      {
        body: uploadBody,
      },
    );
  typia.assert(media);
  TestValidator.equals("uploaded media url preserved", media.url, mediaUrl);

  // 5) Attempt profile update without authorization should fail
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "profile update without auth should fail",
    async () => {
      await api.functional.communityBbs.communityMember.communityMembers.profile.update(
        unauthConn,
        {
          username,
          body: {
            display_name: "ShouldFail",
          } satisfies ICommunityBbsProfile.IUpdate,
        },
      );
    },
  );

  // 6) Perform profile update as the owner
  const newDisplayName = `Owner ${RandomGenerator.name(1)}`;
  const newBio = RandomGenerator.paragraph({ sentences: 8 });
  const updateBody = {
    display_name: newDisplayName,
    bio: newBio,
    avatar_uri: media.url,
  } satisfies ICommunityBbsProfile.IUpdate;

  const updatedProfile: ICommunityBbsProfile =
    await api.functional.communityBbs.communityMember.communityMembers.profile.update(
      connection,
      {
        username,
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);

  // Business validations
  TestValidator.equals(
    "profile display_name updated",
    updatedProfile.display_name,
    newDisplayName,
  );
  TestValidator.equals("profile bio updated", updatedProfile.bio, newBio);
  TestValidator.equals(
    "profile avatar_uri updated",
    updatedProfile.avatar_uri,
    media.url,
  );
  TestValidator.predicate(
    "updated_at is a valid date-time string",
    (() => {
      try {
        return !Number.isNaN(Date.parse(updatedProfile.updated_at));
      } catch {
        return false;
      }
    })(),
  );

  // Note: Direct DB (Prisma) verification and audit log checks are not possible
  // inside this template (no Prisma import allowed). The test therefore validates
  // correctness by asserting the response DTO values and the uploaded media
  // registration. If Prisma verification is required, add Prisma client import
  // in the template scope and query community_bbs_profiles/community_bbs_audit_logs.
}
