import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
 * Test article update by admin workflow.
 * 1. Admin joins and logs in
 * 2. Member joins and logs in
 * 3. Member creates an article in a section
 * 4. Admin updates the article's title, content, and section
 * 5. Validate updated article has new values
 */
export async function test_api_article_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(
        adminConnection.headers?.["Authorization"] ??
          typia.random<string & tags.Format<"email">>(),
      ),
      password: "12345678",
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 2. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email">>(
        memberConnection.headers?.["Authorization"] ??
          typia.random<string & tags.Format<"email">>(),
      ),
      password: "12345678",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 3. Member creates article
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        content: RandomGenerator.content(),
        section_id: section.id,
        tags: [RandomGenerator.name(), RandomGenerator.name()],
      },
    },
  );
  typia.assert(article);
  // 4. Admin updates article
  const newTitle = RandomGenerator.name(3);
  const newContent = RandomGenerator.content({ paragraphs: 3 });
  const updatedArticle =
    await api.functional.discussionBoard.admin.articles.update(
      adminConnection,
      {
        articleId: article.id,
        body: {
          title: newTitle,
          content: newContent,
          section_id: section.id,
          tags: [
            RandomGenerator.name(),
            RandomGenerator.name(),
            RandomGenerator.name(),
          ],
        },
      },
    );
  typia.assert(updatedArticle);
  // 5. Validate updated article has new values
  TestValidator.equals(
    "title updated to new value",
    updatedArticle.title,
    newTitle,
  );
  TestValidator.equals(
    "content updated to new content",
    updatedArticle.content,
    newContent,
  );
  TestValidator.equals(
    "section matches",
    updatedArticle.section.id,
    section.id,
  );
}