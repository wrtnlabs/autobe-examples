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
 * Test the atomic tag replacement behavior when an admin updates an article.
 *
 * This test validates that:
 * 1. Admin joins authentication
 * 2. Admin creates a section
 * 3. Member creates an article with initial set of tags (e.g., ['technology', 'programming'])
 * 4. Admin updates the article with a completely different tag set (e.g., ['business', 'economy'])
 * 5. The old tag associations are completely removed and only the new tags remain
 *
 * This confirms the business rule that tags are replaced atomically during update operations,
 * not merged or appended.
 */
export async function test_api_article_update_tag_replacement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Admin creates a section
  const section: IDiscussionBoardSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member joins authentication (already logged in after join)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(memberAuth);
  // 4. Member creates an article with initial tags
  const initialTags: string[] = ["technology", "programming"];
  const article: IDiscussionBoardArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 3 }),
          discussion_board_section_id: section.id,
          tags: initialTags,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Validate initial tags are present
  TestValidator.equals(
    "initial tag count",
    article.tags.length,
    initialTags.length,
  );
  for (const tagName of initialTags) {
    TestValidator.predicate(
      `tag "${tagName}" exists`,
      article.tags.some((tag) => tag.name === tagName),
    );
  }
  // 5. Admin updates the article with completely different tags
  const newTags: string[] = ["business", "economy"];
  const updatedArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.admin.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          tags: newTags,
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate tag replacement - old tags removed, new tags present
  TestValidator.equals(
    "updated tag count",
    updatedArticle.tags.length,
    newTags.length,
  );
  // Verify new tags exist
  for (const tagName of newTags) {
    TestValidator.predicate(
      `new tag "${tagName}" exists`,
      updatedArticle.tags.some((tag) => tag.name === tagName),
    );
  }
  // Verify old tags are completely removed
  for (const oldTagName of initialTags) {
    TestValidator.predicate(
      `old tag "${oldTagName}" removed`,
      !updatedArticle.tags.some((tag) => tag.name === oldTagName),
    );
  }
}
