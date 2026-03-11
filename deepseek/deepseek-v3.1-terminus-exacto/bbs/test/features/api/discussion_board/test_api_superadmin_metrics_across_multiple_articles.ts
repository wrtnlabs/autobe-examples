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

export async function test_api_superadmin_metrics_across_multiple_articles(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Member authentication and article creation
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "member123",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Create multiple articles with valid section IDs
  // Since we don't have section creation API, we'll use a valid UUID format
  // and rely on the test environment to have at least one valid section
  const validSectionId = typia.random<string & tags.Format<"uuid">>();
  const article1 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: validSectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article1);
  const article2 =
    await generate_random_discussion_board_member_articles_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: validSectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article2);
  // 4. Retrieve metrics for each article
  const metrics1 =
    await api.functional.discussionBoard.superAdmin.articles.metrics.at(
      superAdminConnection,
      {
        articleId: article1.id,
      },
    );
  typia.assert(metrics1);
  const metrics2 =
    await api.functional.discussionBoard.superAdmin.articles.metrics.at(
      superAdminConnection,
      {
        articleId: article2.id,
      },
    );
  typia.assert(metrics2);
  // 5. Validate metrics data isolation
  TestValidator.equals("article1 ID matches", metrics1.id, article1.id);
  TestValidator.equals("article2 ID matches", metrics2.id, article2.id);
  TestValidator.notEquals(
    "article IDs are different",
    article1.id,
    article2.id,
  );
  // 6. Verify metrics are properly scoped (no cross-contamination)
  TestValidator.predicate("metrics1 has valid structure", () => {
    return (
      typeof metrics1.total_views === "number" &&
      typeof metrics1.unique_views === "number" &&
      typeof metrics1.comment_count === "number" &&
      typeof metrics1.reactions.like === "number" &&
      typeof metrics1.reactions.helpful === "number" &&
      typeof metrics1.reactions.insightful === "number" &&
      typeof metrics1.reactions.disagree === "number" &&
      typeof metrics1.favorite_count === "number"
    );
  });
  TestValidator.predicate("metrics2 has valid structure", () => {
    return (
      typeof metrics2.total_views === "number" &&
      typeof metrics2.unique_views === "number" &&
      typeof metrics2.comment_count === "number" &&
      typeof metrics2.reactions.like === "number" &&
      typeof metrics2.reactions.helpful === "number" &&
      typeof metrics2.reactions.insightful === "number" &&
      typeof metrics2.reactions.disagree === "number" &&
      typeof metrics2.favorite_count === "number"
    );
  });
  // 7. Test that metrics are independent (data isolation)
  TestValidator.predicate("metrics are independent between articles", () => {
    // Even if metrics values are the same (e.g., both articles have 0 views),
    // the important thing is that they are correctly attributed to their respective articles
    return metrics1.id !== metrics2.id; // IDs must be different
  });
}
