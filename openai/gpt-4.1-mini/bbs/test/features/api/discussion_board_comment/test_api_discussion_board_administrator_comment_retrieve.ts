import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_discussion_board_administrator_comment_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing comment by UUID
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    { body: {} },
  );
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // Because utility functions to create articles, users, and comments do not exist,
  // we cannot create a comment to fetch. Therefore, we generate a random UUID to
  // simulate fetching a comment. This simulates scenario 1, although the UUID may
  // not correspond to a real comment.
  const validCommentId = typia.random<string & tags.Format<"uuid">>();
  const comment =
    await api.functional.discussionBoard.administrator.comments.at(
      adminConnection,
      { commentId: validCommentId },
    );
  typia.assert(comment);
  // Validate comment timestamps (ISO 8601)
  TestValidator.predicate(
    "comment.createdAt is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(comment.createdAt),
  );
  TestValidator.predicate(
    "comment.updatedAt is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(comment.updatedAt),
  );
  if (comment.deletedAt !== null) {
    TestValidator.predicate(
      "comment.deletedAt is ISO 8601 or null",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
        comment.deletedAt,
      ),
    );
  }
  // Validate nested author and article summaries
  typia.assert(comment.author);
  typia.assert(comment.article);
  // Scenario 2: Attempt to retrieve a comment with a non-existent UUID => expect 404
  const invalidCommentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieving non-existent comment returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.comments.at(
        adminConnection,
        {
          commentId: invalidCommentId,
        },
      );
    },
  );
}
