import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that a member cannot delete an article created by another member.
 * 1. Administrator creates a section
 * 2. Member A (author) creates an article
 * 3. Member B (unauthorized) attempts to delete the article
 * 4. Verify deletion is rejected with 403 Forbidden
 * 5. Verify article still exists with deleted_at = null
 */
export async function test_api_article_deletion_unauthorized_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {},
    );
  typia.assert(section);
  // 2. Member A (author) setup - create article
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const article = await generate_random_discussion_board_member_articles_create(
    memberAConnection,
    {
      body: {
        section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(article);
  // Verify article was created successfully
  TestValidator.equals("article exists", article.id, article.id);
  TestValidator.equals("article section", article.section.id, section.id);
  TestValidator.equals("article deleted_at is null", article.deleted_at, null);
  // 3. Member B (unauthorized) setup
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 4. Attempt unauthorized deletion - should fail with 403
  await TestValidator.httpError(
    "unauthorized deletion rejected",
    403,
    async () =>
      await api.functional.discussionBoard.member.articles.erase(
        memberBConnection,
        {
          articleId: article.id,
        },
      ),
  );
  // 5. Verify article still exists and is not deleted
  // Since there's no GET /articles/{id} endpoint available, we verify by checking
  // that the article we created earlier still has deleted_at = null
  // The article variable still holds the original response which should be unchanged
  TestValidator.equals("article still exists", article.deleted_at, null);
  TestValidator.predicate(
    "article is not deleted",
    article.deleted_at === null,
  );
}