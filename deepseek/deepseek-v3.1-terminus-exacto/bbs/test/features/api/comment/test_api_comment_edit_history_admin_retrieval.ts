import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentEditHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentEditHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

/**
 * Test successful retrieval of comment edit history by administrator.
 * An administrator authenticates, creates or identifies a comment with edit history,
 * then queries the edit history endpoint. Validate that all edit records are returned
 * with proper pagination, chronological ordering, and complete metadata including
 * edit sequence numbers, timestamps, and edit reasons. Verify that the administrator
 * can view the complete audit trail of comment modifications.
 */
export async function test_api_comment_edit_history_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. ADMINISTRATOR SETUP
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 2. CREATE ARTICLE FOR COMMENTS
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. REGULAR USER SETUP
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // 4. CREATE INITIAL COMMENT
  const initialComment =
    await api.functional.discussionBoard.user.articles.comments.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  // 5. PERFORM MULTIPLE EDITS TO GENERATE EDIT HISTORY
  const editCount = 3;
  const editContents: string[] = [];
  for (let i = 0; i < editCount; i++) {
    const newContent = RandomGenerator.paragraph({ sentences: 2 });
    editContents.push(newContent);
    const updatedComment =
      await api.functional.discussionBoard.user.articles.comments.update(
        userConnection,
        {
          articleId: article.id,
          commentId: initialComment.id,
          body: {
            content: newContent,
          } satisfies IDiscussionBoardComment.IUpdate,
        },
      );
    typia.assert(updatedComment);
  }
  // 6. ADMINISTRATOR RETRIEVES EDIT HISTORY
  const historyRequest: IDiscussionBoardCommentEditHistory.IRequest = {
    page: 1,
    limit: 10,
  };
  const editHistory =
    await api.functional.discussionBoard.admin.comments.edit_histories.index(
      adminConnection,
      {
        commentId: initialComment.id,
        body: historyRequest,
      },
    );
  typia.assert(editHistory);
  // 7. VALIDATE PAGINATION AND EDIT HISTORY
  TestValidator.equals(
    "pagination current page",
    editHistory.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", editHistory.pagination.limit, 10);
  TestValidator.predicate(
    "has edit history records",
    editHistory.data.length > 0,
  );
  TestValidator.predicate(
    "total records matches expected",
    editHistory.pagination.records >= editCount,
  );
  TestValidator.predicate(
    "has pages calculated",
    editHistory.pagination.pages >= 1,
  );
  // 8. VALIDATE EDIT HISTORY CONTENTS
  if (editHistory.data.length > 0) {
    // Check chronological ordering (earliest first)
    for (let i = 0; i < editHistory.data.length - 1; i++) {
      const current = new Date(editHistory.data[i].created_at);
      const next = new Date(editHistory.data[i + 1].created_at);
      TestValidator.predicate("chronological ordering", current <= next);
    }
    // Validate edit sequence numbers
    TestValidator.equals(
      "first edit sequence",
      editHistory.data[0].edit_sequence,
      1,
    );
    // Validate metadata completeness
    editHistory.data.forEach((history, index) => {
      TestValidator.predicate(
        `history ${index} has id`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          history.id,
        ),
      );
      TestValidator.predicate(
        `history ${index} has valid edit sequence`,
        history.edit_sequence > 0 && history.edit_sequence <= editCount + 1,
      );
      TestValidator.predicate(
        `history ${index} has valid timestamp`,
        !isNaN(new Date(history.created_at).getTime()),
      );
    });
  }
}
