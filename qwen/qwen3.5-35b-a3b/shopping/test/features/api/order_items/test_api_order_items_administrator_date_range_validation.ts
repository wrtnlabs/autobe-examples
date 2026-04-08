import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test date range validation for administrator order items listing endpoint.
 *
 * Validates that the order items listing endpoint correctly rejects requests with invalid date ranges.
 * The test ensures that when created_at_from date is after created_at_to date, the system returns
 * a 400 Bad Request error, preventing performance issues and logical errors in querying.
 *
 * This endpoint accepts date range filters for searching order items by creation date.
 * The business rule requires that the start date (created_at_from) must be less than or
 * equal to the end date (created_at_to). When this rule is violated, the request is
 * rejected at the input validation layer with an appropriate error message.
 *
 * 1. Administrator joins the platform to obtain authentication tokens
 * 2. Administrator creates invalid date range where from > to
 * 3. Administrator attempts to search order items with invalid date range
 * 4. Validates the system rejects the request with 400 Bad Request error
 * 5. Verifies error message clearly indicates the date range validation failure
 */
export async function test_api_order_items_administrator_date_range_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins the platform
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IEcommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // 2. Create invalid date range: from date is AFTER to date
  const now = new Date();
  const future = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30); // 30 days in future
  const past = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days in past
  // Invalid date range where from > to
  const invalidDateRangeRequest = {
    created_at_from: future.toISOString(),
    created_at_to: past.toISOString(),
  } satisfies IEcommerceMallOrderItem.IRequest;
  // 3. Test that invalid date range is rejected with 400 Bad Request
  await TestValidator.error(
    "invalid date range should be rejected",
    async () => {
      await api.functional.ecommerceMall.administrator.order_items.index(
        adminConnection,
        {
          body: invalidDateRangeRequest,
        },
      );
    },
  );
}
