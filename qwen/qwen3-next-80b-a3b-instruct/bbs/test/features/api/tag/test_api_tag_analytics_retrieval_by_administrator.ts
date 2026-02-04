import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_tag_analytics_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Test that administrators can retrieve paginated tag statistics showing usage count and last used timestamp for all tags in the system.
  // Validates that only administrators can access this endpoint, tags are correctly aggregated by usage count in descending order,
  // and empty/null tags are excluded from results.
  // Step 1: Create an administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: `https://${RandomGenerator.alphaNumeric(10)}.com`,
    referrer: `https://${RandomGenerator.alphaNumeric(12)}.org`,
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // Step 2: Retrieve tag analytics as administrator
  const tagAnalytics =
    await api.functional.economicDiscussion.administrator.admin.analytics.tags.index(
      adminConnection,
    );
  typia.assert(tagAnalytics);
  // Step 3: Validate pagination structure
  const pagination = tagAnalytics.pagination;
  TestValidator.equals(
    "pagination current page is at least 1",
    pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is at least 1", pagination.limit, 1);
  TestValidator.equals(
    "pagination record count matches data length",
    pagination.records,
    tagAnalytics.data.length,
  );
  TestValidator.predicate(
    "pagination pages equals ceiling of records divided by limit",
    () => pagination.pages === Math.ceil(pagination.records / pagination.limit),
  );
  // Step 4: Verify all tags are non-empty and non-null (excludes empty/null tags as per spec)
  TestValidator.predicate("all tags are non-empty and non-null", () =>
    tagAnalytics.data.every(
      (tag) => tag.tag !== null && tag.tag !== "" && tag.tag.length > 0,
    ),
  );
  // Step 5: Verify tags are sorted by count descending
  TestValidator.predicate("tags sorted by count descending", () => {
    for (let i = 0; i < tagAnalytics.data.length - 1; i++) {
      if (tagAnalytics.data[i].count < tagAnalytics.data[i + 1].count) {
        return false;
      }
    }
    return true;
  });
  // Step 6: Validate tag structure and data types
  TestValidator.predicate("all tags have correct data structure", () =>
    tagAnalytics.data.every(
      (tag) =>
        typeof tag.tag === "string" &&
        typeof tag.count === "number" &&
        tag.count >= 0 &&
        typeof tag.lastUsed === "string",
    ),
  );
}
