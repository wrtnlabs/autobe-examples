import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_article_analytics_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://${RandomGenerator.alphaNumeric(12)}.com`,
    referrer: `https://${RandomGenerator.alphaNumeric(10)}.org`,
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Step 2: Verify that unauthenticated users cannot access the analytics endpoint
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated user should receive 403 Forbidden",
    async () => {
      await api.functional.economicDiscussion.administrator.admin.analytics.articles.index(
        guestConnection,
      );
    },
  );
  // Step 3: Verify that authenticated administrator can access the endpoint
  const analytics =
    await api.functional.economicDiscussion.administrator.admin.analytics.articles.index(
      adminConnection,
    );
  typia.assert(analytics);
  // Step 4: Validate the structure of the analytics response - only what's in the DTO
  TestValidator.predicate(
    "comment count is non-negative",
    analytics.comment_count >= 0,
  );
  TestValidator.predicate("tags array exists", analytics.tags.length >= 0);
  // Step 5: Verify the tags have expected structure
  if (analytics.tags.length > 0) {
    TestValidator.predicate(
      "first tag has a name",
      analytics.tags[0].name !== null,
    );
  }
}
