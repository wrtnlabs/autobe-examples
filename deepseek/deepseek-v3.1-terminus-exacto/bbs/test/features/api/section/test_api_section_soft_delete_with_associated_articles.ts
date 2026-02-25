import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_soft_delete_with_associated_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<IDiscussionBoardSuperAdmin.IJoin>,
  });
  // 2. Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials: DeepPartial<IDiscussionBoardAdmin.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // 3. Create a section with admin privileges
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      } satisfies DeepPartial<IDiscussionBoardSection.ICreate>,
    },
  );
  typia.assert(section);
  // 4. Create a regular user and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials: DeepPartial<IDiscussionBoardUser.IJoin> = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  };
  await authorize_user_join(userConnection, { body: userCredentials });
  // 5. Create articles in the section
  const articles: IDiscussionBoardArticle[] = [];
  for (let i = 0; i < 3; i++) {
    const article = await generate_random_discussion_board_user_articles_create(
      userConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: section.id,
        } satisfies DeepPartial<IDiscussionBoardArticle.ICreate>,
      },
    );
    typia.assert(article);
    articles.push(article);
  }
  // 6. Verify section is accessible and contains articles
  TestValidator.equals("section created successfully", section.id, section.id);
  TestValidator.predicate(
    "section has no deleted_at timestamp",
    () => section.deleted_at === null,
  );
  // 7. Perform soft deletion as superAdmin
  await api.functional.discussionBoard.superAdmin.sections.erase(
    superAdminConnection,
    {
      sectionId: section.id,
    },
  );
  // 8. Verify articles remain intact with section reference preserved
  TestValidator.equals("articles count preserved", articles.length, 3);
  articles.forEach((article, index) => {
    TestValidator.equals(
      `article ${index} section reference preserved`,
      article.section.id,
      section.id,
    );
  });
}
