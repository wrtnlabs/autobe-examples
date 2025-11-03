import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCitizen";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";

export async function test_api_comment_search_invalid_pagination_parameters(
  connection: api.IConnection,
) {
  // 1. Authenticate as citizen
  const citizenEmail: string = typia.random<string & tags.Format<"email">>();
  const citizen: IDiscussionBoardCitizen.IAuthorized =
    await api.functional.auth.citizen.join(connection, {
      body: {
        email: citizenEmail,
        password: "password123",
      } satisfies IDiscussionBoardCitizen.ICreate,
    });
  typia.assert(citizen);

  // 2. Create a post to associate with comments
  const post: IDiscussionBoardPost =
    await api.functional.discussionBoard.citizen.posts.create(connection, {
      body: "Test post content with sufficient length" satisfies IDiscussionBoardPost.ICreate,
    });
  typia.assert(post);

  // 3. Create multiple comments for search
  const commentCount = 5;
  const createdComments: IDiscussionBoardComment[] = [];
  for (let i = 0; i < commentCount; i++) {
    const comment: IDiscussionBoardComment =
      await api.functional.discussionBoard.citizen.posts.comments.create(
        connection,
        {
          postId: post as unknown as string,
          body: {
            discussion_board_post_id: post as unknown as string,
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  // 4. Test with negative page number
  await TestValidator.error("should reject negative page number", async () => {
    await api.functional.discussionBoard.comments.index(connection, {
      body: JSON.stringify({
        page: -1,
        limit: 10,
      }) satisfies IDiscussionBoardComment.IRequest,
    });
  });

  // 5. Test with zero page size
  await TestValidator.error("should reject zero page size", async () => {
    await api.functional.discussionBoard.comments.index(connection, {
      body: JSON.stringify({
        page: 1,
        limit: 0,
      }) satisfies IDiscussionBoardComment.IRequest,
    });
  });

  // 6. Test with negative page size
  await TestValidator.error("should reject negative page size", async () => {
    await api.functional.discussionBoard.comments.index(connection, {
      body: JSON.stringify({
        page: 1,
        limit: -5,
      }) satisfies IDiscussionBoardComment.IRequest,
    });
  });

  // 7. Test with zero page number
  await TestValidator.error("should reject zero page number", async () => {
    await api.functional.discussionBoard.comments.index(connection, {
      body: JSON.stringify({
        page: 0,
        limit: 10,
      }) satisfies IDiscussionBoardComment.IRequest,
    });
  });
}
