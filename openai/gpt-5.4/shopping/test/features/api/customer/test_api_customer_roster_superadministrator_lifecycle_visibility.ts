import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_roster_superadministrator_lifecycle_visibility(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const baselineRequest = {
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallCustomer.IRequest;
  const baseline = await api.functional.shoppingMall.customers.index(
    superAdministratorConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline pagination current page",
    baseline.pagination.current,
    baselineRequest.page,
  );
  TestValidator.equals(
    "baseline pagination limit",
    baseline.pagination.limit,
    baselineRequest.limit,
  );
  TestValidator.predicate(
    "baseline data length within pagination limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  TestValidator.predicate(
    "baseline pages zero only when records zero",
    baseline.pagination.records === 0
      ? baseline.pagination.pages === 0
      : baseline.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "baseline pages cover total records",
    baseline.pagination.pages >=
      Math.ceil(
        baseline.pagination.records / Math.max(baseline.pagination.limit, 1),
      ),
  );
  for (const summary of baseline.data) {
    TestValidator.predicate(
      "baseline summary preserves identity fields",
      summary.id.length > 0 && summary.email.length > 0,
    );
    TestValidator.predicate(
      "baseline summary exposes banned_at as nullable timestamp",
      summary.banned_at === null || typeof summary.banned_at === "string",
    );
    TestValidator.predicate(
      "baseline summary exposes deleted_at as nullable timestamp",
      summary.deleted_at === null || typeof summary.deleted_at === "string",
    );
  }
  const deletedFilterRequest = {
    deleted_at: null,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallCustomer.IRequest;
  const undeletedPage = await api.functional.shoppingMall.customers.index(
    superAdministratorConnection,
    {
      body: deletedFilterRequest,
    },
  );
  typia.assert(undeletedPage);
  TestValidator.equals(
    "undeleted page current page",
    undeletedPage.pagination.current,
    deletedFilterRequest.page,
  );
  TestValidator.equals(
    "undeleted page limit",
    undeletedPage.pagination.limit,
    deletedFilterRequest.limit,
  );
  TestValidator.predicate(
    "undeleted page length within limit",
    undeletedPage.data.length <= undeletedPage.pagination.limit,
  );
  TestValidator.predicate(
    "undeleted pages zero only when records zero",
    undeletedPage.pagination.records === 0
      ? undeletedPage.pagination.pages === 0
      : undeletedPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "undeleted pages cover total records",
    undeletedPage.pagination.pages >=
      Math.ceil(
        undeletedPage.pagination.records /
          Math.max(undeletedPage.pagination.limit, 1),
      ),
  );
  const bannedFilterRequest = {
    banned_at: null,
    page: 1,
    limit: 10,
    sort: "-created_at",
  } satisfies IShoppingMallCustomer.IRequest;
  const unbannedPage = await api.functional.shoppingMall.customers.index(
    superAdministratorConnection,
    {
      body: bannedFilterRequest,
    },
  );
  typia.assert(unbannedPage);
  TestValidator.equals(
    "unbanned page current page",
    unbannedPage.pagination.current,
    bannedFilterRequest.page,
  );
  TestValidator.equals(
    "unbanned page limit",
    unbannedPage.pagination.limit,
    bannedFilterRequest.limit,
  );
  TestValidator.predicate(
    "unbanned page length within limit",
    unbannedPage.data.length <= unbannedPage.pagination.limit,
  );
  TestValidator.predicate(
    "unbanned pages zero only when records zero",
    unbannedPage.pagination.records === 0
      ? unbannedPage.pagination.pages === 0
      : unbannedPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "unbanned pages cover total records",
    unbannedPage.pagination.pages >=
      Math.ceil(
        unbannedPage.pagination.records /
          Math.max(unbannedPage.pagination.limit, 1),
      ),
  );
  const sampled = baseline.data[0];
  if (sampled !== undefined) {
    const identityRequest = {
      email: sampled.email,
      page: 1,
      limit: 10,
      sort: "-created_at",
    } satisfies IShoppingMallCustomer.IRequest;
    const identityPage = await api.functional.shoppingMall.customers.index(
      superAdministratorConnection,
      {
        body: identityRequest,
      },
    );
    typia.assert(identityPage);
    TestValidator.equals(
      "identity page current page",
      identityPage.pagination.current,
      identityRequest.page,
    );
    TestValidator.equals(
      "identity page limit",
      identityPage.pagination.limit,
      identityRequest.limit,
    );
    TestValidator.predicate(
      "identity page length within limit",
      identityPage.data.length <= identityPage.pagination.limit,
    );
    TestValidator.predicate(
      "identity search returns sampled customer",
      identityPage.data.some((customer) => customer.id === sampled.id),
    );
    const matched = identityPage.data.find(
      (customer) => customer.id === sampled.id,
    );
    TestValidator.predicate(
      "matched identity exists in filtered roster",
      matched !== undefined,
    );
    if (matched !== undefined) {
      TestValidator.equals(
        "matched identity email",
        matched.email,
        sampled.email,
      );
      TestValidator.equals("matched identity id", matched.id, sampled.id);
      TestValidator.equals(
        "matched identity banned_at visibility",
        matched.banned_at,
        sampled.banned_at,
      );
      TestValidator.equals(
        "matched identity deleted_at visibility",
        matched.deleted_at,
        sampled.deleted_at,
      );
    }
  }
}
