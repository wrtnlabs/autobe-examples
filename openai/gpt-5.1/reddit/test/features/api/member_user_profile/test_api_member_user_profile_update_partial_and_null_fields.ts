import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_member_user_profile_update_partial_and_null_fields(
  connection: api.IConnection,
) {
  // 1. Register a new member user to obtain an authenticated memberUser
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and nullable; omit it to let server derive it
    href: "https://example.com/signup" as string & tags.Format<"uri">,
    referrer: "https://example.com/landing" as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create a community to ensure memberUser context exists
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<1> &
      tags.MaxLength<128>,
    name: RandomGenerator.paragraph({ sentences: 2 }) as string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. First profile update: set non-null strings and initial boolean flags
  const handle: string = authorized.username;

  const firstUpdateBody = {
    tagline: RandomGenerator.paragraph({ sentences: 1 }),
    bio: RandomGenerator.paragraph({ sentences: 4 }),
    avatar_uri:
      "https://cdn.example.com/avatars/" +
      RandomGenerator.alphaNumeric(16) +
      ".png",
    website_uri: "https://" + RandomGenerator.alphabets(8) + ".example.org",
    show_total_karma: true,
    show_post_karma: false,
    show_comment_karma: true,
    is_profile_public: true,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const firstProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle,
        body: firstUpdateBody,
      },
    );
  typia.assert(firstProfile);

  // 4. Second profile update: clear some fields with null, omit website_uri, toggle booleans
  const secondUpdateBody = {
    tagline: null,
    bio: null,
    avatar_uri: null,
    // website_uri intentionally omitted so it should remain unchanged
    show_total_karma: !firstProfile.show_total_karma,
    show_post_karma: !firstProfile.show_post_karma,
    show_comment_karma: !firstProfile.show_comment_karma,
    is_profile_public: !firstProfile.is_profile_public,
  } satisfies ICommunityPlatformUserProfile.IUpdate;

  const secondProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.memberUser.profiles.update(
      connection,
      {
        handle,
        body: secondUpdateBody,
      },
    );
  typia.assert(secondProfile);

  // 5. Business assertions between firstProfile and secondProfile

  // tagline, bio, avatar_uri cleared
  TestValidator.equals(
    "tagline should be cleared to null",
    secondProfile.tagline ?? null,
    null,
  );
  TestValidator.equals(
    "bio should be cleared to null",
    secondProfile.bio ?? null,
    null,
  );
  TestValidator.equals(
    "avatar_uri should be cleared to null",
    secondProfile.avatar_uri ?? null,
    null,
  );

  // website_uri unchanged because field omitted in second update
  TestValidator.equals(
    "website_uri should remain unchanged when omitted",
    secondProfile.website_uri ?? null,
    firstProfile.website_uri ?? null,
  );

  // Boolean visibility flags toggled to new values
  TestValidator.equals(
    "show_total_karma should reflect newly provided value",
    secondProfile.show_total_karma,
    !firstProfile.show_total_karma,
  );
  TestValidator.equals(
    "show_post_karma should reflect newly provided value",
    secondProfile.show_post_karma,
    !firstProfile.show_post_karma,
  );
  TestValidator.equals(
    "show_comment_karma should reflect newly provided value",
    secondProfile.show_comment_karma,
    !firstProfile.show_comment_karma,
  );
  TestValidator.equals(
    "is_profile_public should reflect newly provided value",
    secondProfile.is_profile_public,
    !firstProfile.is_profile_public,
  );

  // Identity and lifecycle fields must remain stable
  TestValidator.equals(
    "profile id must remain unchanged between updates",
    secondProfile.id,
    firstProfile.id,
  );
  TestValidator.equals(
    "profile handle must remain unchanged between updates",
    secondProfile.handle,
    firstProfile.handle,
  );
  TestValidator.equals(
    "created_at must remain unchanged between updates",
    secondProfile.created_at,
    firstProfile.created_at,
  );

  // updated_at must advance
  const firstUpdatedAt = new Date(firstProfile.updated_at).getTime();
  const secondUpdatedAt = new Date(secondProfile.updated_at).getTime();
  TestValidator.predicate(
    "updated_at of second profile must be later than first profile",
    secondUpdatedAt > firstUpdatedAt,
  );
}
