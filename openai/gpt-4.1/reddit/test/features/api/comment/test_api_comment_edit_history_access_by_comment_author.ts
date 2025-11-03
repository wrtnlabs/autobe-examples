import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEditHistory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLinks } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLinks";
import type { ICommunityPlatformPostTexts } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostTexts";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentEditHistory";

/**
 * Validate that a comment author can access the edit history of their own
 * comment.
 *
 * Due to the absence of a comment edit API in the available SDK, this test
 * covers:
 *
 * 1. Register a new user who will be the author.
 * 2. Create a new community by that user.
 * 3. Create a post in the created community.
 * 4. Create a comment on the post as the user.
 * 5. Immediately retrieve the edit history for the comment as the original author.
 * 6. Assert that the edit history list exists and, since no edit is possible, is
 *    empty or as permitted by the API design.
 */
export async function test_api_comment_edit_history_access_by_comment_author(
  connection: api.IConnection,
) {
  // 1. Register user and authenticate
  const userEmail = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email: userEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/",
  } satisfies ICommunityPlatformUser.IJoin;
  const userAuth = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(userAuth);

  // 2. Create new community
  const communityBody = {
    name: RandomGenerator.alphabets(12),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.user.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create post in community
  const postBody = {
    community_id: community.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    text_body: RandomGenerator.paragraph({ sentences: 10 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.user.posts.create(
    connection,
    { body: postBody },
  );
  typia.assert(post);

  // 4. Create comment on the post
  const originalCommentBody = {
    post_id: post.id,
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformComment.ICreate;
  const comment = await api.functional.communityPlatform.user.comments.create(
    connection,
    { body: originalCommentBody },
  );
  typia.assert(comment);

  // 5. Retrieve edit history for the comment as its author
  const historyReqBody =
    {} satisfies ICommunityPlatformCommentEditHistory.IRequest;
  const historiesPage =
    await api.functional.communityPlatform.user.comments.editHistories.index(
      connection,
      {
        commentId: comment.id,
        body: historyReqBody,
      },
    );
  typia.assert(historiesPage);

  // 6. Validation: since no edit operation is available, the history should be empty or as per API's first-version policy
  TestValidator.predicate(
    "edit history returns empty for not-edited comment",
    Array.isArray(historiesPage.data) && historiesPage.data.length === 0,
  );
}
