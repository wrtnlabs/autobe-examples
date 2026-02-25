import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachmentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachmentReference";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_articles_create } from "../../../generate/generate_random_discussion_board_registered_user_articles_create";
import { generate_random_discussion_board_registered_user_comments_create } from "../../../generate/generate_random_discussion_board_registered_user_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_comments_snapshots_update_with_soft_delete_marking(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 2: Update a comment snapshot with soft delete timestamp and verify snapshot is marked as deleted in the results. Setup includes article and comment creation. Ensure that the deletedAt field in request body results in snapshot being flagged as deleted and pagination info is correctly returned.
  // 1. Register a new user and get authorized connection
  const joinConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "ValidPass123!",
    },
  });
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Create an article with the authorized user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          title: "Soft Delete Test Article",
          content: "Content for deleting snapshot test.",
          sectionId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(article);
  // 3. Create a comment for the article
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: "Test comment for snapshot soft delete update.",
        },
      },
    );
  typia.assert(comment);
  // 4. Prepare soft delete timestamp
  const deletedAt = new Date().toISOString();
  // 5. Update the comment snapshot with deletedAt timestamp
  // For patch, also provide content, here we reuse comment.content as snapshot body
  const response =
    await api.functional.discussionBoard.comments.snapshots.updateSnapshots(
      userConnection,
      {
        commentId: comment.id,
        body: {
          body: comment.content,
          deletedAt: deletedAt,
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(response);
  // 6. Validate response data contains at least one snapshot with deletedAt value matching the request
  const softDeletedSnapshots = response.data.filter(
    (snapshot) =>
      snapshot.deletedAt !== null && snapshot.deletedAt === deletedAt,
  );
  TestValidator.predicate(
    "Soft deleted snapshots exist with matching deletedAt",
    softDeletedSnapshots.length > 0,
  );
  // 7. Validate pagination info
  TestValidator.predicate(
    "Pagination current page is 1 or greater",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "Pagination limit is positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "Pagination records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "Pagination pages count is 0 or greater",
    response.pagination.pages >= 0,
  );
}
