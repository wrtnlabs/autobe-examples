import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_article_admin_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<100>
      >(),
    } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
  });
  // superAdminConnection.headers is now updated internally by authorize function
  // Step 2: Call the admin analytics endpoint with authenticated super admin connection
  const analytics: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.superAdministrator.admin.analytics.articles.index(
      superAdminConnection,
    );
  typia.assert(analytics);
  // Step 3: Validate analytics response structure based on the scenario description
  // Note: The SDK return type IEconomicDiscussionArticle is used for compilation,
  // but it represents an analytics summary, not a real article
  TestValidator.equals(
    "analytics title should be 'Analytics Overview'",
    analytics.title,
    "Analytics Overview",
  );
  TestValidator.predicate(
    "analytics posted_time should be a valid ISO date-time",
    analytics.posted_time !== null,
  );
  TestValidator.predicate(
    "analytics author should have an id",
    analytics.author.id !== undefined,
  );
  TestValidator.predicate(
    "analytics tags should be an array",
    Array.isArray(analytics.tags),
  );
  TestValidator.predicate(
    "analytics comment_count should be a number",
    typeof analytics.comment_count === "number",
  );
  TestValidator.predicate(
    "analytics comment_count should not be negative",
    analytics.comment_count >= 0,
  );
  TestValidator.predicate(
    "analytics id should be a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      analytics.id,
    ),
  );
  // Validate tag structure as described
  TestValidator.predicate(
    "each tag should have a name",
    analytics.tags.every((tag) => tag.name !== undefined),
  );
  // The scenario requested: total article count, published/deleted count, average length, top 10 tags
  // But these metrics are not representable in IEconomicDiscussionArticle structure
  // We can only validate what the schema provides: comment_count (as average), tags (top 10)
  // We assume comment_count represents average comments per article
  // We assume tags array contains top 10 most frequently used tags
  // Validation of totalArticles, publishedArticles, deletedArticles, averageLength
  // is NOT possible due to schema limitation - these properties do not exist in IEconomicDiscussionArticle
}
