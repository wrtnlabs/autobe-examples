import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostEditHistory";

/**
 * Validate that requesting a post edit history snapshot with an editHistoryId
 * that does not belong to the specified postId fails without leaking data.
 *
 * Business goal
 *
 * - Ensure that GET
 *   /communityPlatform/memberUser/posts/{postId}/editHistories/{editHistoryId}
 *   enforces the (postId, editHistoryId) relationship.
 * - When an editHistoryId does not belong to the given postId (or does not exist
 *   at all), the server must respond with an error instead of returning any
 *   snapshot data.
 *
 * Scenario outline
 *
 * 1. Register Member A using POST /auth/memberUser/join.
 *
 *    - Use ICommunityPlatformMemberuser.IJoin as request body.
 *    - On success, the SDK populates connection.headers.Authorization using the
 *         returned IAuthorizationToken.
 * 2. Create Community 1 via POST /communityPlatform/memberUser/communities.
 *
 *    - Use ICommunityPlatformCommunity.ICreate.
 * 3. Create Post 1 in Community 1 via POST /communityPlatform/memberUser/posts.
 *
 *    - Use ICommunityPlatformPost.ICreate.
 * 4. Create Community 2 via the same endpoint.
 * 5. Create Post 2 in Community 2.
 * 6. Prepare a clearly unrelated editHistoryId value.
 *
 *    - Use typia.random<string & tags.Format<"uuid">>() to generate a UUID.
 *    - This UUID is not known to belong to Post 2, and in most realistic cases will
 *         not correspond to any existing edit history snapshot.
 *    - Even if it happened to exist for some reason, it is not tied to Post 2, so a
 *         strict implementation must still treat the pair as mismatched.
 * 7. Call GET
 *    /communityPlatform/memberUser/posts/{postId}/editHistories/{editHistoryId}
 *    with:
 *
 *    - PostId = post2.id
 *    - EditHistoryId = the random UUID from step 6.
 * 8. Assert that the call fails by using TestValidator.error with an async
 *    callback and await it.
 *
 *    - We do not assert any concrete status code, only that an error occurs.
 * 9. Additionally, validate that all successful API responses match their DTO
 *    types using typia.assert, and perform simple logical checks:
 *
 *    - Post1.community_id === community1.id
 *    - Post2.community_id === community2.id
 */
export async function test_api_post_edit_history_snapshot_not_found_for_mismatched_post(
  connection: api.IConnection,
) {
  // 1. Register Member A and obtain an authorized session via SDK.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const member: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(member);

  // 2. Create Community 1.
  const community1Body = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community1Body },
    );
  typia.assert<ICommunityPlatformCommunity>(community1);

  // 3. Create Post 1 in Community 1.
  const post1Body = {
    communityId: community1.id,
    communityCode: community1.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post1: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: post1Body,
    });
  typia.assert<ICommunityPlatformPost>(post1);

  // Ensure Post 1 is tied to Community 1.
  TestValidator.equals(
    "post1 belongs to community1",
    post1.community_id,
    community1.id,
  );

  // 4. Create Community 2.
  const community2Body = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: community2Body },
    );
  typia.assert<ICommunityPlatformCommunity>(community2);

  // 5. Create Post 2 in Community 2.
  const post2Body = {
    communityId: community2.id,
    communityCode: community2.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post2: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: post2Body,
    });
  typia.assert<ICommunityPlatformPost>(post2);

  // Ensure Post 2 is tied to Community 2 and is distinct from Post 1.
  TestValidator.equals(
    "post2 belongs to community2",
    post2.community_id,
    community2.id,
  );
  TestValidator.notEquals(
    "post1 and post2 are distinct posts",
    post1.id,
    post2.id,
  );

  // 6. Prepare a random editHistoryId (unrelated to Post 2).
  const mismatchedEditHistoryId = typia.random<string & tags.Format<"uuid">>();

  // 7-8. Call editHistories.at with mismatched (postId, editHistoryId) pair
  // and assert that it fails.
  await TestValidator.error(
    "mismatched post/editHistory pair must fail",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.editHistories.at(
        connection,
        {
          postId: post2.id,
          editHistoryId: mismatchedEditHistoryId,
        },
      );
    },
  );
}
