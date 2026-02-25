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

export async function test_api_comments_snapshots_update_successful_body_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a registered user and get an authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_registered_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    },
  });
  typia.assert(userJoin);
  userConnection.headers = { Authorization: userJoin.token.access };
  // 2. Create an article by the registered user
  const article =
    await generate_random_discussion_board_registered_user_articles_create(
      userConnection,
      {
        body: {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Article for Comment Snapshot Update",
          content:
            "This article is created for testing comment snapshot updates.",
        },
      },
    );
  typia.assert(article);
  // 3. Create a comment on the article
  const comment =
    await generate_random_discussion_board_registered_user_comments_create(
      userConnection,
      {
        body: {
          discussionBoardArticleId: article.id,
          content: "Original comment content",
        },
      },
    );
  typia.assert(comment);
  // 4. Prepare comment snapshot update body with new body content and pagination
  const updatedBody = "Updated comment snapshot content for testing.";
  const updateRequestBody: IDiscussionBoardCommentSnapshot.IRequest = {
    body: updatedBody,
    page: 1,
    limit: 10,
  };
  // 5. Invoke PATCH /discussionBoard/comments/{commentId}/snapshots endpoint to update snapshots
  const updatedSnapshots =
    await api.functional.discussionBoard.comments.snapshots.updateSnapshots(
      userConnection,
      {
        commentId: comment.id,
        body: updateRequestBody,
      },
    );
  typia.assert(updatedSnapshots);
  // 6. Validate the pagination structure and updated snapshot contents
  TestValidator.predicate(
    "pagination current page is 1",
    updatedSnapshots.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    updatedSnapshots.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records count is non-negative",
    updatedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is non-negative",
    updatedSnapshots.pagination.pages >= 0,
  );
  // Validate that all snapshot bodies in data match the updated body
  updatedSnapshots.data.forEach((snapshot) => {
    TestValidator.equals("updated snapshot body", snapshot.body, updatedBody);
    TestValidator.predicate(
      "snapshot has createdAt timestamp",
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has updatedAt timestamp",
      typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0,
    );
    TestValidator.equals(
      "snapshot comment id matches",
      snapshot.discussionBoardCommentId,
      comment.id,
    );
  });
}
