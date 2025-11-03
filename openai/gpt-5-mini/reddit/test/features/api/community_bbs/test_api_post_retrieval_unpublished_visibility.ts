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
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

export async function test_api_post_retrieval_unpublished_visibility(
  connection: api.IConnection,
) {
  // 1) Create author (alice)
  const aliceEmail = `alice.${Date.now()}@example.test`;
  const aliceUsername = `alice_${Date.now()}`;
  const aliceAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: {
        email: aliceEmail,
        username: aliceUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(aliceAuth);

  // 2) Create bob (non-author) using a cloned connection so tokens don't collide
  const bobConn: api.IConnection = { ...connection, headers: {} };
  const bobEmail = `bob.${Date.now()}@example.test`;
  const bobUsername = `bob_${Date.now()}`;
  const bobAuth: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(bobConn, {
      body: {
        email: bobEmail,
        username: bobUsername,
        password: "Passw0rd!",
        session_context: {
          href: "http://localhost/",
          referrer: "http://localhost/",
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    });
  typia.assert(bobAuth);

  // 3) As alice, create a community that requires post approval
  const unique = `${Date.now()}`;
  const communitySlug = `test-community-${unique}`;
  const communityName = `Test Community ${unique}`;
  const community: ICommunityBbsCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      {
        body: {
          name: communityName,
          slug: communitySlug,
          description: "Community for unpublished post visibility test",
          visibility: "public",
          post_approval_required: true,
          settings: {
            require_post_approval: true,
            visibility: "public",
            max_images_per_post: 5,
            allowed_image_mime_types: ["image/jpeg", "image/png"],
          } satisfies ICommunityBbsCommunity.ISettings.ICreate,
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community slug matches", community.slug, communitySlug);

  // 4) As alice, create a post that will be in pending/unpublished state
  const createdPost: ICommunityBbsPost =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: communitySlug,
        body: {
          title: "Draft: Invisible Post",
          body: "This post should remain unpublished until approved",
          post_type: "text",
        } satisfies ICommunityBbsPost.ICreate,
      },
    );
  typia.assert(createdPost);

  // The server should have created the post in non-published/pending state
  TestValidator.predicate(
    "created post should not be published immediately",
    createdPost.is_published === false ||
      createdPost.business_status !== "published",
  );

  // 5) As bob (non-author), attempt to retrieve the unpublished post -> expect error (403 or 404)
  await TestValidator.error(
    "non-author cannot retrieve unpublished post",
    async () => {
      await api.functional.communityBbs.communities.posts.at(bobConn, {
        communitySlug: communitySlug,
        postId: createdPost.id,
      });
    },
  );

  // 6) As alice (author), retrieve the unpublished post and assert fields
  const fetchedByAuthor: ICommunityBbsPost =
    await api.functional.communityBbs.communities.posts.at(connection, {
      communitySlug: communitySlug,
      postId: createdPost.id,
    });
  typia.assert(fetchedByAuthor);

  // Author should receive the unpublished state and be able to see their post
  TestValidator.equals(
    "author can retrieve own post",
    fetchedByAuthor.id,
    createdPost.id,
  );
  TestValidator.equals(
    "business status visible to author",
    fetchedByAuthor.business_status,
    createdPost.business_status,
  );
  TestValidator.predicate(
    "post remains unpublished for author view",
    fetchedByAuthor.is_published === false ||
      fetchedByAuthor.business_status !== "published",
  );
}
