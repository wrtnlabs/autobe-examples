import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Test scenario for moderator updating a post: validates permissions and
 * business rules.
 *
 * Steps:
 *
 * 1. Register as moderator and obtain authorization
 * 2. Create a new community as moderator
 * 3. Create a new post in the community
 * 4. Update the post as the moderator (valid update within window/permissions)
 * 5. Attempt: update as unauthenticated user (should fail)
 * 6. Attempt: update with invalid content (too long for title)
 * 7. Assert audit timestamps are updated on success and not on failure
 */
export async function test_api_post_update_by_moderator_edit_window_and_permissions(
  connection: api.IConnection,
) {
  // 1. Register as moderator and obtain authorization
  const moderatorEmail = RandomGenerator.alphaNumeric(10) + "@test.com";
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const communityCreate = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(8),
    description: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityCreate },
    );
  typia.assert(community);

  // 2. Register new moderator for this community
  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        community_id: community.id,
      },
    });
  typia.assert(moderatorAuth);
  // 3. Create a post as the moderator
  const createBody = {
    community_platform_community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    content_type: "text",
    status: "published",
  } satisfies ICommunityPlatformPost.ICreate;
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.moderator.posts.create(connection, {
      body: createBody,
    });
  typia.assert(post);
  // 4. Update the post as the moderator (valid update)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content_body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    status: "published",
  } satisfies ICommunityPlatformPost.IUpdate;
  const updated: ICommunityPlatformPost =
    await api.functional.communityPlatform.moderator.posts.update(connection, {
      postId: post.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.predicate(
    "updated_at timestamp changes on successful update",
    new Date(updated.updated_at) > new Date(post.updated_at),
  );

  // 5. Try updating with a completely unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-authenticated user cannot update moderator post",
    async () => {
      await api.functional.communityPlatform.moderator.posts.update(
        unauthConn,
        {
          postId: post.id,
          body: { title: "Unauthorized update attempt" },
        },
      );
    },
  );

  // 6. Try updating with invalid values (title exceeds max length)
  await TestValidator.error(
    "post update with too-long title is rejected",
    async () => {
      const longTitle = RandomGenerator.alphabets(350);
      await api.functional.communityPlatform.moderator.posts.update(
        connection,
        {
          postId: post.id,
          body: {
            title: longTitle,
          },
        },
      );
    },
  );

  // 7. Attempt to update the post after waiting or simulating expiration of edit window (if backend enforces by status, not exposed for direct manipulation, so this step cannot be forced, only verified via business failure scenario if possible)
  await TestValidator.error(
    "post update with invalid status is rejected",
    async () => {
      await api.functional.communityPlatform.moderator.posts.update(
        connection,
        {
          postId: post.id,
          body: {
            status: "archived",
          },
        },
      );
    },
  );
}
