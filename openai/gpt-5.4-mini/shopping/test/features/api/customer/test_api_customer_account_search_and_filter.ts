import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Search and filter administrator customer registry results.
 *
 * Validates that administrator authentication succeeds and that the customer registry endpoint returns a stable paginated summary list when queried with search and lifecycle status criteria. The test focuses on response structure, pagination metadata, permitted summary fields, and deterministic ordering across repeated requests.
 *
 * 1. Authenticate as an administrator using the dedicated join utility.
 * 2. Request the administrator customer registry with a search term and status filter.
 * 3. Validate pagination metadata and the customer summary payload shape.
 * 4. Repeat the same request and confirm deterministic ordering and identical results.
 */
export async function test_api_customer_account_search_and_filter(
  connection: api.IConnection,
): Promise<void> {
  const authConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(authConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: authorized.token.access,
  };
  const request = {
    search: RandomGenerator.alphabets(5),
    status: "active",
    page: 1,
    limit: 10,
    sort: "created_at",
    order: "asc",
  } satisfies IMallPlatformCustomer.IRequest;
  const first = await api.functional.mallPlatform.administrator.customers.index(
    adminConnection,
    { body: request },
  );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.administrator.customers.index(
      adminConnection,
      { body: request },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current page",
    first.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "pagination limit",
    first.pagination.limit,
    request.limit,
  );
  TestValidator.equals(
    "stable record count",
    first.pagination.records,
    second.pagination.records,
  );
  TestValidator.equals(
    "stable page count",
    first.pagination.pages,
    second.pagination.pages,
  );
  TestValidator.equals("stable data ordering", first.data, second.data);
  TestValidator.predicate(
    "all customer summaries expose only permitted fields",
    () =>
      first.data.every(
        (customer) =>
          Object.keys(customer).sort().join(",") ===
          [
            "created_at",
            "deleted_at",
            "email",
            "id",
            "status",
            "updated_at",
          ].join(","),
      ),
  );
}
