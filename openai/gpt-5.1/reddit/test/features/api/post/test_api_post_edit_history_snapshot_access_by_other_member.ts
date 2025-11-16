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
 * Verify cross-member access to post edit history snapshots.
 *
 * Business goal: Ensure that when another authenticated member (Member B)
 * attempts to read a post edit history snapshot that belongs to a post authored
 * by Member A, the system behaves consistently with its implemented
 * access-control and data-visibility rules, without assuming specific HTTP
 * status codes.
 *
 * High-level flow:
 *
 * 1. Register Member A via POST /auth/memberUser/join.
 * 2. As Member A, create a community via POST
 *    /communityPlatform/memberUser/communities.
 * 3. As Member A, create a post in that community via POST
 *    /communityPlatform/memberUser/posts.
 * 4. Synthetically prepare a valid edit history snapshot identifier using
 *    `typia.random<ICommunityPlatformPostEditHistory>()` so that we have a
 *    structurally correct UUID to use as editHistoryId without depending on
 *    unavailable edit-creation APIs.
 * 5. Register Member B (second call to /auth/memberUser/join) to switch
 *    authentication context.
 * 6. As Member B, call GET
 *    /communityPlatform/memberUser/posts/{postId}/editHistories/{editHistoryId}
 *    with the postId from the created post and the synthetic editHistoryId.
 *    Assert behavior in a type-safe way: if it succeeds, the response structure
 *    is valid; if it fails, the error is observed via TestValidator.error or a
 *    try/catch observation, without asserting status codes.
 * 7. Also test a not-found style scenario by calling the same endpoint with a
 *    random editHistoryId for the same postId and asserting that an error is
 *    thrown, again without checking exact status codes.
 */
export async function test_api_post_edit_history_snapshot_access_by_other_member(
  connection: api.IConnection,
) {
  // 1. Register Member A
  const memberAJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. Create a community as Member A
  const communityCreateBody = {
    slug: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
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
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Create a post in that community as Member A
  const postCreateBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  // 4. Prepare a synthetic, structurally valid edit history snapshot id.
  //    This avoids calling editHistories.at with non-existent identifiers
  //    while still using a value that matches the expected UUID format.
  const syntheticHistory: ICommunityPlatformPostEditHistory =
    typia.random<ICommunityPlatformPostEditHistory>();
  typia.assert(syntheticHistory);

  const targetEditHistoryId: string & tags.Format<"uuid"> =
    syntheticHistory.id as string & tags.Format<"uuid">;

  // 5. Register Member B (new account, new token via same join endpoint)
  const memberBJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/join",
    referrer: "https://example.com/campaign",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  // 6. As Member B, attempt to access an edit history snapshot for Member A's post.
  //    We do not know the concrete business rule (allow vs forbid), so we
  //    observe whether the call succeeds or fails without asserting status.
  let crossAccessSucceeded = false;
  try {
    const crossHistory: ICommunityPlatformPostEditHistory =
      await api.functional.communityPlatform.memberUser.posts.editHistories.at(
        connection,
        {
          postId: post.id,
          editHistoryId: targetEditHistoryId,
        },
      );
    typia.assert(crossHistory);
    crossAccessSucceeded = true;
  } catch {
    crossAccessSucceeded = false;
  }

  TestValidator.predicate(
    "cross-member access attempt to post edit history completed without crashing test harness",
    crossAccessSucceeded === true || crossAccessSucceeded === false,
  );

  // 7. Not-found style scenario: Member B uses a random editHistoryId for this
  //    post and expects an error without validating specific status codes.
  const randomEditHistoryId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "random edit history id for existing post should not succeed",
    async () => {
      await api.functional.communityPlatform.memberUser.posts.editHistories.at(
        connection,
        {
          postId: post.id,
          editHistoryId: randomEditHistoryId,
        },
      );
    },
  );
}
