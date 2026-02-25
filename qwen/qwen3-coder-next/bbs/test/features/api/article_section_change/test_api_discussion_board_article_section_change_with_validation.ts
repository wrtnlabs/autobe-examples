import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_article_section_change_with_validation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCredentials,
  });
  // Step 2: Create first test section
  const firstSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(firstSection);
  // Step 3: Create article using member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinInput = typia.random<IDiscussionBoardMember.IJoin>();
  const memberLoginInput: IDiscussionBoardMember.ILogin = {
    email: memberJoinInput.email,
    password: memberJoinInput.password,
    href: "https://example.com",
    referrer: "https://referrer.com",
  };
  await authorize_member_join(memberConnection, { body: memberJoinInput });
  await authorize_member_login(memberConnection, { body: memberLoginInput });
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph(),
        content: RandomGenerator.content(),
        section_id: firstSection.id,
        tags: [RandomGenerator.name(2)],
      },
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article in first section",
    article.section.id,
    firstSection.id,
  );
  // Step 4: Create second test section
  const secondSection =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(secondSection);
  // Step 5: Update article to change section using super admin
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          title: article.title,
          content: article.content,
          section_id: secondSection.id,
          tags: article.tags?.split(",") || ["updated"],
        },
      },
    );
  typia.assert(updatedArticle);
  TestValidator.equals(
    "section changed to second",
    updatedArticle.section.id,
    secondSection.id,
  );
  // Step 6: Test validation with invalid section_id
  await TestValidator.error("invalid section_id validation", async () => {
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          title: article.title,
          content: article.content,
          section_id: "00000000-0000-0000-0000-000000000000",
          tags: ["invalid"],
        },
      },
    );
  });
}
