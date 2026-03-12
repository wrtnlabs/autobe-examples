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

export async function test_api_comment_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator comment deletion workflow.
   * Validates that administrators have elevated privileges to delete any comment
   * regardless of the original author, demonstrating content moderation capabilities.
   */
  // 1. Administrator setup - create and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create a section for article organization
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 3. Member setup - create and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 4. Member creates an article in the section
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // 5. Member creates a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(comment);
  // 6. Verify comment was created by member (not admin)
  TestValidator.equals(
    "comment author is member",
    comment.author.id,
    memberAuth.id,
  );
  TestValidator.notEquals(
    "comment author is not admin",
    comment.author.id,
    adminAuth.id,
  );
  // 7. Administrator deletes the member's comment
  await api.functional.discussionBoard.administrator.articles.comments.erase(
    adminConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // 8. Verify deletion was successful by attempting to delete again (should fail)
  await TestValidator.error("comment already deleted", async () => {
    await api.functional.discussionBoard.administrator.articles.comments.erase(
      adminConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  });
}
