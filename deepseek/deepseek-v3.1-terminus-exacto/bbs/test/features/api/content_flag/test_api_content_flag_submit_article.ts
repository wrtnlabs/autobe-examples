import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_content_flag_submit_article(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: "https://test.com",
      referrer: "https://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create section as admin
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create first user connection and authorize
  const articleAuthorConnection: api.IConnection = { host: connection.host };
  const articleAuthor = await authorize_user_join(articleAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create article as first user
  const article = await generate_random_discussion_board_user_articles_create(
    articleAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 5,
          wordMax: 10,
        }),
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 10,
          wordMax: 15,
        }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create second user (reporter) connection and authorize
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_user_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Submit content flag as reporter
  const flagReason =
    "This article contains inappropriate content that violates community guidelines.";
  const contentFlag =
    await generate_random_discussion_board_user_content_flags_create(
      reporterConnection,
      {
        body: {
          flagged_article_id: article.id,
          flag_reason: flagReason,
        } satisfies IDiscussionBoardContentFlag.ICreate,
      },
    );
  typia.assert(contentFlag);
  // Validate flag properties
  TestValidator.equals("flag status", contentFlag.status, "pending");
  TestValidator.equals("flag reason", contentFlag.flag_reason, flagReason);
  TestValidator.equals("reporter ID", contentFlag.reporter.id, reporter.id);
  TestValidator.predicate(
    "flagged article exists",
    contentFlag.flaggedArticle !== null &&
      contentFlag.flaggedArticle !== undefined,
  );
  TestValidator.equals(
    "flagged article ID",
    contentFlag.flaggedArticle!.id,
    article.id,
  );
  TestValidator.equals(
    "resolved_at should be null",
    contentFlag.resolved_at,
    null,
  );
  TestValidator.equals(
    "resolution_reason should be null",
    contentFlag.resolution_reason,
    null,
  );
  TestValidator.equals(
    "flagged comment should be null",
    contentFlag.flaggedComment,
    null,
  );
  TestValidator.equals(
    "reviewing admin should be null",
    contentFlag.reviewingAdmin,
    null,
  );
}
