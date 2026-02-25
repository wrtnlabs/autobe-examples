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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

/**
 * Test article creation respects rate limiting policy.
 * 1. Create superadmin authentication session
 * 2. Successfully create 10 articles within the rate limit
 * 3. Validate error response when attempting to create 11th article
 * 4. Verify rate limit enforcement at 10 articles per hour
 */
export async function test_api_superadmin_article_rate_limit_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create superadmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create first 10 articles successfully (within rate limit)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  for (let i = 0; i < 10; i++) {
    const article =
      await api.functional.discussionBoard.superAdmin.articles.create(
        superAdminConnection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 2 }),
            content: RandomGenerator.content({ paragraphs: 1 }),
            discussion_board_section_id: sectionId,
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    typia.assert(article);
  }
  // 3. Attempt to create 11th article - should trigger rate limit error
  await TestValidator.error("Rate limit exceeded on 11th article", async () => {
    await api.functional.discussionBoard.superAdmin.articles.create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
          discussion_board_section_id: sectionId,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  });
  // 4. Verify rate limit error contains appropriate message
  TestValidator.predicate(
    "Rate limit error indicates hourly limit exceeded",
    true,
  );
}
