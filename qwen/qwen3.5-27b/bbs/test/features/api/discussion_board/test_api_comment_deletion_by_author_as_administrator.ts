import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that an administrator can delete their own comment when they authored it.
 * This validates that administrators retain the same deletion rights as regular members
 * for their own content, in addition to their elevated moderation privileges.
 *
 * Test flow:
 * 1. Authenticate as an administrator
 * 2. Create a section for article organization
 * 3. Create an article as the administrator
 * 4. Create a comment on the article as the administrator
 * 5. Delete the comment as the administrator
 * 6. Verify successful deletion
 */
export async function test_api_comment_deletion_by_author_as_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Create a section for article organization
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Create an article as the administrator
  const article = await generate_random_discussion_board_member_articles_create(
    adminConnection,
    {
      body: {
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Create a comment on the article as the administrator
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      adminConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Delete the comment as the administrator
  await api.functional.discussionBoard.administrator.articles.comments.erase(
    adminConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // 6. Validate successful deletion (no error thrown means success)
  TestValidator.predicate("comment deletion succeeded", true);
}
