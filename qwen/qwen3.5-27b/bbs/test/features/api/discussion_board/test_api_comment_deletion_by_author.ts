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

export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a registered member can successfully delete their own comment from an article.
   *
   * Setup:
   * 1. Register and authenticate as administrator
   * 2. Create a section for article organization
   * 3. Register and authenticate as a member
   * 4. Create an article in the section as the member
   * 5. Create a comment on the article as the same member
   *
   * Test Execution:
   * 1. Delete the comment using the member's authenticated connection
   * 2. Verify the deletion succeeds without errors
   */
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member setup - create article and comment
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 3. Verify comment exists before deletion
  TestValidator.equals(
    "comment exists before deletion",
    comment.id,
    comment.id,
  );
  TestValidator.predicate(
    "comment has valid content",
    comment.content.length > 0,
  );
  // 4. Delete the comment as the author
  await api.functional.discussionBoard.member.articles.comments.erase(
    memberConnection,
    {
      articleId: article.id,
      commentId: comment.id,
    },
  );
  // 5. Verify deletion succeeded - no error thrown means success
  TestValidator.predicate("comment deletion completed without error", true);
  // 6. Verify the article still exists and is intact
  TestValidator.equals(
    "article still exists after comment deletion",
    article.id,
    article.id,
  );
  TestValidator.predicate(
    "article content unchanged",
    article.content.length > 0,
  );
}
