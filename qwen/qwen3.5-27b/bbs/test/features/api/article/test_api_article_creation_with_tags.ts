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
 * Test that an authenticated member can successfully create a new article in an existing section with optional tags.
 * 1. Administrator joins and logs in to create a section (prerequisite)
 * 2. Member joins and logs in to authenticate
 * 3. Member creates an article with title, content, section_id, and tags array
 * 4. Validate response contains full article details including author info, section info, assigned tags, and comments_count of 0
 * 5. Tags are automatically created if they don't exist
 * 6. Article is properly associated with the authenticated member's account
 */
export async function test_api_article_creation_with_tags(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      display_name: "Test Admin",
      bio: "Administrator for testing",
    },
  });
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: "Test Section",
          description: "A section for testing article creation",
        },
      },
    );
  typia.assert(section);
  // 2. Member setup - join and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
      display_name: "Test Member",
      bio: "Member for testing",
    },
  });
  typia.assert(memberAuth);
  // 3. Create article with tags
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: "My First Article",
        content:
          "This is the content of my first article. It contains some text to test the article creation functionality.",
        section_id: section.id,
        tags: ["typescript", "testing", "e2e"],
      },
    },
  );
  typia.assert(article);
  // 4. Validate response structure and business logic
  TestValidator.equals(
    "article title matches input",
    article.title,
    "My First Article",
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    "This is the content of my first article. It contains some text to test the article creation functionality.",
  );
  TestValidator.equals(
    "article belongs to correct section",
    article.section.id,
    section.id,
  );
  TestValidator.equals(
    "article author is the member",
    article.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "article has correct tags count",
    article.tags.length,
    3,
  );
  TestValidator.equals("article has zero comments", article.comments_count, 0);
  TestValidator.predicate(
    "article has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
  TestValidator.predicate(
    "article has valid created_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      article.created_at,
    ),
  );
  TestValidator.predicate(
    "article has valid updated_at",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      article.updated_at,
    ),
  );
  // 5. Validate tags were created/assigned correctly
  const tagNames = article.tags.map((tag) => tag.name);
  TestValidator.predicate(
    "article has 'typescript' tag",
    tagNames.includes("typescript"),
  );
  TestValidator.predicate(
    "article has 'testing' tag",
    tagNames.includes("testing"),
  );
  TestValidator.predicate("article has 'e2e' tag", tagNames.includes("e2e"));
  // 6. Validate section info in response
  TestValidator.equals(
    "section name matches",
    article.section.name,
    "Test Section",
  );
  TestValidator.predicate(
    "section has valid id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.section.id,
    ),
  );
  // 7. Validate author info in response
  TestValidator.equals(
    "author display name matches",
    article.author.display_name,
    "Test Member",
  );
  TestValidator.equals(
    "author email matches",
    article.author.email,
    "member@test.com",
  );
}
