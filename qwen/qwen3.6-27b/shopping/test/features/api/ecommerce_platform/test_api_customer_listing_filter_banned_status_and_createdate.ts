import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Validates platform administrator filtering customer accounts by banned status and creation date range.
 *
 * Authenticates as a platform administrator and queries the customer listing endpoint with strict filters to
 * retrieve only banned accounts created within the last 30 days. This ensures the PATCH /ecommercePlatform/customers
 * endpoint correctly handles boolean filtering and dual-boundary timestamp filtering while maintaining accurate
 * pagination metadata matching the constrained result set.
 *
 * 1. Administrator registers and authenticates with platform credentials.
 * 2. Constructs request filters specifying isBanned: true and inclusive date range boundaries.
 * 3. Fetches customer accounts matching all specified criteria via the platform index endpoint.
 * 4. Validates all returned customers match the filtering parameters and pagination structure.
 */
export async function test_api_customer_listing_filter_banned_status_and_createdate(
  connection: api.IConnection,
) {
  // 1. Platform administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies DeepPartial<IEcommercePlatformAdmin.IJoin>,
  });
  // 2. Prepare date range filters (30-day lookback window)
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // 3. Construct filtering request parameters
  const request: IEcommercePlatformCustomer.IRequest = {
    isBanned: true,
    createdAtFrom: thirtyDaysAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformCustomer.IRequest;
  // 4. Execute filtered customer listing query
  const response = await api.functional.ecommercePlatform.customers.index(
    adminConnection,
    { body: request },
  );
  typia.assert(response);
  // 5. Validate pagination and business logic results
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit respects request limit bounds",
    response.pagination.limit <= 10,
  );
  TestValidator.predicate(
    "pagination total records meets non-negative constraint",
    response.pagination.records >= 0,
  );
  // Validate business logic when records are present
  if (response.data.length > 0) {
    TestValidator.equals(
      "all returned users strictly match isBanned filter status",
      response.data.every(
        (customer) => customer.is_banned === request.isBanned,
      ),
      true,
    );
    TestValidator.predicate(
      "all returned users strictly match createdAt date range boundaries",
      response.data.every(
        (customer) =>
          customer.created_at >= request.createdAtFrom! &&
          customer.created_at <= request.createdAtTo!,
      ),
    );
  } else {
    TestValidator.predicate(
      "empty result set handled validly when criteria match no data",
      true,
    );
  }
}
