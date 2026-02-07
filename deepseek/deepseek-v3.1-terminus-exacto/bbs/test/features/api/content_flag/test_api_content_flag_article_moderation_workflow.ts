import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_content_flags_create } from "../../../generate/generate_random_discussion_board_user_content_flags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_content_flag } from "../../../prepare/prepare_random_discussion_board_content_flag";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test content flag retrieval for an article moderation workflow.
 * This scenario simulates a complete moderation process where a reporter user flags an inappropriate article,
 * and a super admin reviews the flag details. First authenticate as super admin to create a discussion section,
 * then authenticate as article author to create an article, then authenticate as reporter to flag the article,
 * and finally as super admin to retrieve and verify the flag details including flagged article reference,
 * section information, and comprehensive flag metadata.
 */
export async function test_api_content_flag_article_moderation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin creates a discussion section
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 2. Article author creates an article
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const article = await generate_random_discussion_board_user_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: section.id,
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Reporter user flags the article
  const reporterConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const flag = await generate_random_discussion_board_user_content_flags_create(
    reporterConnection,
    {
      body: {
        flag_reason: RandomGenerator.paragraph({ sentences: 3 }),
        flagged_article_id: article.id,
      } satisfies IDiscussionBoardContentFlag.ICreate,
    },
  );
  typia.assert(flag);
  // 4. Super admin retrieves and verifies the flag details
  const retrievedFlag =
    await api.functional.discussionBoard.superAdmin.content_flags.at(
      superAdminConnection,
      {
        flagId: flag.id,
      },
    );
  typia.assert(retrievedFlag);
  // Validate flag details
  TestValidator.equals("flag ID matches", retrievedFlag.id, flag.id);
  TestValidator.equals(
    "flag reason matches",
    retrievedFlag.flag_reason,
    flag.flag_reason,
  );
  TestValidator.equals(
    "flag status is pending",
    retrievedFlag.status,
    "pending",
  );
  TestValidator.predicate(
    "has flagged article",
    retrievedFlag.flaggedArticle !== null,
  );
  if (retrievedFlag.flaggedArticle) {
    TestValidator.equals(
      "flagged article ID matches",
      retrievedFlag.flaggedArticle.id,
      article.id,
    );
    TestValidator.equals(
      "flagged article title matches",
      retrievedFlag.flaggedArticle.title,
      article.title,
    );
    TestValidator.equals(
      "flagged article section matches",
      retrievedFlag.flaggedArticle.section.id,
      section.id,
    );
  }
  TestValidator.predicate(
    "has reporter information",
    retrievedFlag.reporter !== null,
  );
  TestValidator.equals(
    "reporter display name is not empty",
    true,
    retrievedFlag.reporter.display_name.length > 0,
  );
}