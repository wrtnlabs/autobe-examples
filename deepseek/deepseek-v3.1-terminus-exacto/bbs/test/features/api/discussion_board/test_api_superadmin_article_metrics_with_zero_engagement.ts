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
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test that article metrics are correctly calculated and returned even when an article has no engagement data.
 * As a super administrator, authenticate, create a new article, then immediately retrieve its metrics
 * before any views, comments, reactions, or favorites occur.
 */
export async function test_api_superadmin_article_metrics_with_zero_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(member);
  // 2. Create super admin connection and register a super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  typia.assert(superAdmin);
  // 3. Login as super admin to get authentication
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: "admin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // NOTE: Section creation functionality is not available in the provided API functions
  // Since we cannot create sections via the available SDK functions, we need to use
  // a valid existing section ID or find an alternative approach
  // 4. Create an article using the member connection
  // Using a random UUID as section ID - this assumes a valid section exists
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Immediately retrieve article metrics using super admin connection
  const metrics =
    await api.functional.discussionBoard.superAdmin.articles.metrics.at(
      superAdminConnection,
      {
        articleId: article.id,
      },
    );
  typia.assert(metrics);
  // 6. Validate all metrics are zero/null as expected for zero engagement
  TestValidator.equals("article ID matches", metrics.id, article.id);
  TestValidator.equals("total views should be zero", metrics.total_views, 0);
  TestValidator.equals("unique views should be zero", metrics.unique_views, 0);
  TestValidator.equals(
    "comment count should be zero",
    metrics.comment_count,
    0,
  );
  TestValidator.equals(
    "favorite count should be zero",
    metrics.favorite_count,
    0,
  );
  TestValidator.equals(
    "like reactions should be zero",
    metrics.reactions.like,
    0,
  );
  TestValidator.equals(
    "helpful reactions should be zero",
    metrics.reactions.helpful,
    0,
  );
  TestValidator.equals(
    "insightful reactions should be zero",
    metrics.reactions.insightful,
    0,
  );
  TestValidator.equals(
    "disagree reactions should be zero",
    metrics.reactions.disagree,
    0,
  );
  TestValidator.equals(
    "latest comment timestamp should be null",
    metrics.latest_comment_at,
    null,
  );
}
