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
 * Test article creation without tags.
 * Validates that members can create articles with only required fields (title, content, section_id)
 * without providing any tags, and the article is properly created with an empty tags array.
 */
export async function test_api_article_creation_without_tags(
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
  // 2. Member setup - authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Prepare article creation data without tags
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const content = RandomGenerator.content({ paragraphs: 2 });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title,
        content,
        section_id: section.id,
      },
    },
  );
  typia.assert(article);
  // 4. Validate article details
  TestValidator.equals("article title matches input", article.title, title);
  TestValidator.equals(
    "article section matches",
    article.section.id,
    section.id,
  );
  TestValidator.equals("tags array is empty", article.tags.length, 0);
  TestValidator.equals("comments count is 0", article.comments_count, 0);
  TestValidator.predicate("author has valid ID", article.author.id.length > 0);
}
