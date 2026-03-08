import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "Admin123!@#",
      display_name: "Admin User",
      bio: "System administrator",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Setup: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "Member123!@#",
      display_name: "Member User",
      bio: "Regular community member",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Setup: Get available sections and create article in first available section
  const sections = [
    { id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", name: "General" },
    { id: "b2c3d4e5-f6a7-8901-bcde-f12345678901", name: "Technical" },
  ];
  const section = sections[0] ?? sections[1];
  // Create test article as member
  const article =
    await api.functional.discussionBoard.member.sections.articles.create(
      memberConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.name(3),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 4. Test: Admin retrieves article details
  const adminArticle = await api.functional.discussionBoard.articles.at(
    adminConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(adminArticle);
  TestValidator.equals("admin can view article", adminArticle.id, article.id);
  TestValidator.equals(
    "article title matches",
    adminArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article content matches",
    adminArticle.content,
    article.content,
  );
  TestValidator.equals(
    "author summary exists",
    adminArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section summary exists",
    adminArticle.section.id,
    article.section.id,
  );
  TestValidator.predicate(
    "files array exists",
    Array.isArray(adminArticle.files),
  );
  TestValidator.predicate(
    "taggings array exists",
    Array.isArray(adminArticle.taggings),
  );
  // 5. Test: Member retrieves article details
  const memberArticle = await api.functional.discussionBoard.articles.at(
    memberConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(memberArticle);
  TestValidator.equals("member can view article", memberArticle.id, article.id);
  // 6. Test: Guest (unauthenticated) retrieves article details
  const guestConnection: api.IConnection = { host: connection.host };
  const guestArticle = await api.functional.discussionBoard.articles.at(
    guestConnection,
    {
      articleId: article.id,
    },
  );
  typia.assert(guestArticle);
  TestValidator.equals("guest can view article", guestArticle.id, article.id);
  // 7. Test: Non-existent article ID returns 404
  await TestValidator.error("non-existent article returns 404", async () => {
    await api.functional.discussionBoard.articles.at(connection, {
      articleId: "00000000-0000-0000-0000-000000000000",
    });
  });
  // 8. Test: Malformed UUID validation
  await TestValidator.error(
    "malformed UUID returns validation error",
    async () => {
      await api.functional.discussionBoard.articles.at(connection, {
        articleId: "invalid-uuid",
      });
    },
  );
}
