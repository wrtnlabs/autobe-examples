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
 * Test that an authenticated member can successfully update the title and content of an article they authored.
 *
 * 1. Register and authenticate as administrator
 * 2. Create a section for the article
 * 3. Register and authenticate as a member
 * 4. Create an article in the section
 * 5. Update the article's title and content
 * 6. Validate the updated article maintains correct metadata
 */
export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      href: "https://test.com/admin",
      referrer: "https://test.com/admin",
    },
  });
  // 2. Create a section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "A test section for article updates",
        },
      },
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "password123",
      display_name: "Test Member",
      href: "https://test.com/member",
      referrer: "https://test.com/member",
    },
  });
  typia.assert(memberAuth);
  // 4. Create an article
  const originalArticle =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: "Original Article Title",
          content: "This is the original content of the article.",
          section_id: section.id,
          tags: ["test", "update"],
        },
      },
    );
  typia.assert(originalArticle);
  // Store original timestamps for comparison
  const originalCreatedAt = originalArticle.created_at;
  const originalUpdatedAt = originalArticle.updated_at;
  // 5. Update the article
  const updatedArticle =
    await api.functional.discussionBoard.member.articles.update(
      memberConnection,
      {
        articleId: originalArticle.id,
        body: {
          title: "Updated Article Title",
          content: "This is the updated content of the article.",
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // 6. Validate the updated article
  TestValidator.equals(
    "title updated",
    updatedArticle.title,
    "Updated Article Title",
  );
  TestValidator.equals(
    "content updated",
    updatedArticle.content,
    "This is the updated content of the article.",
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    originalArticle.author.id,
  );
  TestValidator.equals(
    "section unchanged",
    updatedArticle.section.id,
    originalArticle.section.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedArticle.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at changed",
    updatedArticle.updated_at !== originalUpdatedAt,
  );
  TestValidator.equals("deleted_at is null", updatedArticle.deleted_at, null);
  TestValidator.predicate("has tags", updatedArticle.tags.length > 0);
  TestValidator.predicate(
    "has comments_count",
    updatedArticle.comments_count >= 0,
  );
}
