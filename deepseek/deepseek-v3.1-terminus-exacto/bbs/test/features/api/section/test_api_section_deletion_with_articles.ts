import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_with_articles(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section
  const section =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
    );
  typia.assert(section);
  // Create multiple articles in the section
  const articles = await ArrayUtil.asyncRepeat(3, async () => {
    const article =
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 3,
              wordMax: 8,
            }),
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 6,
            }),
            discussion_board_section_id: section.id,
          } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
        },
      );
    typia.assert(article);
    return article;
  });
  // Delete the section
  await api.functional.discussionBoard.admin.sections.erase(adminConnection, {
    sectionId: section.id,
  });
  // Validate deletion by attempting operations that should fail
  await TestValidator.error(
    "section deletion should prevent article creation",
    async () => {
      await generate_random_discussion_board_admin_articles_create(
        adminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 1 }),
            discussion_board_section_id: section.id,
          } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
        },
      );
    },
  );
}
