import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticleTag";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_tag_analytics_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SuperPassword123!",
        display_name: RandomGenerator.name(),
      } satisfies IEconomicDiscussionSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Call the tag analytics endpoint with super administrator connection
  const tagAnalytics =
    await api.functional.economicDiscussion.superAdministrator.admin.analytics.tags.index(
      superAdminConnection,
    );
  typia.assert(tagAnalytics);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    tagAnalytics.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    tagAnalytics.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    tagAnalytics.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    tagAnalytics.pagination.pages >= 0,
  );
  // Validate that pages is correctly calculated as Math.ceil(records / limit)
  if (tagAnalytics.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      tagAnalytics.pagination.records / tagAnalytics.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculated correctly",
      tagAnalytics.pagination.pages,
      expectedPages,
    );
  }
  // Validate each tag analytics entry
  for (const tag of tagAnalytics.data) {
    TestValidator.predicate(
      "tag name is a non-empty string",
      typeof tag.tag === "string" && tag.tag.length > 0,
    );
    TestValidator.predicate(
      "tag name length does not exceed 50 characters",
      tag.tag.length <= 50,
    );
    TestValidator.predicate(
      "tag count is a positive integer",
      typeof tag.count === "number" &&
        Number.isInteger(tag.count) &&
        tag.count > 0,
    );
    TestValidator.predicate(
      "lastUsed is ISO 8601 date-time format",
      typeof tag.lastUsed === "string" &&
        /^\d{4}\-\d{2}\-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          tag.lastUsed,
        ),
    );
  }
}
