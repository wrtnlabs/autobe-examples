import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article creation with multiple tag assignments.
 * 1. Admin creates section for article categorization
 * 2. Member creates article with multiple tags
 * 3. Validate tags are correctly associated with the article
 * 4. Test duplicate tag deduplication
 */
export async function test_api_article_creation_with_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // 2. Member setup - create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Create article with multiple tags
  const tagId1 = typia.random<string & tags.Format<"uuid">>();
  const tagId2 = typia.random<string & tags.Format<"uuid">>();
  const tagId3 = typia.random<string & tags.Format<"uuid">>();
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
        tags: [tagId1, tagId2, tagId3],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Validate article has tags assigned
  TestValidator.equals("article has tags", article.tags.length, 3);
  TestValidator.predicate(
    "all tags are valid",
    article.tags.every((tag) => tag.id !== undefined),
  );
  // 5. Test duplicate tag deduplication
  const articleWithDuplicates =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: section.id,
          tags: [tagId1, tagId1, tagId2, tagId2, tagId3], // duplicates
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(articleWithDuplicates);
  // Should have deduplicated to 3 unique tags
  TestValidator.equals(
    "duplicate tags deduplicated",
    articleWithDuplicates.tags.length,
    3,
  );
}
