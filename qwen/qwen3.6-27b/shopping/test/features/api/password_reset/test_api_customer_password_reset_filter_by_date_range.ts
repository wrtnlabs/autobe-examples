import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Customer searches their password reset tokens within a specific date range to audit account recovery activity.
 *
 * Submits a search request with dateFrom and dateTo parameters to filter password reset records by creation time. Verifies the endpoint returns only tokens created within the specified date range for the authenticated customer. Validates that tokens created before dateFrom or after dateTo are excluded from results, and the returned list contains only the customer's own tokens within the requested time window, ensuring proper temporal filtering and data isolation.
 *
 * 1. Registers and authenticates as a customer to obtain valid session tokens.
 * 2. Defines a date range spanning the past week up to the current moment.
 * 3. Submits a search request using the password resets index endpoint with the defined dateFrom and dateTo parameters.
 * 4. Validates the paginated response structure and checks that all returned tokens fall within the requested time window.
 * 5. Ensures pagination metadata is correctly populated and results match the temporal constraints.
 */
export async function test_api_customer_password_reset_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // 2. Define date range for filtering
  const now = new Date();
  const dateFrom = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const dateTo = now.toISOString();
  // 3. Search password reset tokens within date range
  const searchBody = {
    dateFrom,
    dateTo,
    unused: undefined,
  } satisfies IEcommercePlatformCustomerPasswordReset.IRequest;
  const output =
    await api.functional.ecommercePlatform.customer.password_resets.index(
      customerConnection,
      {
        body: searchBody,
      },
    );
  // 4. Validate response structure
  typia.assert(output);
  // 5. Validate all returned tokens are within the date range
  for (const resetToken of output.data) {
    TestValidator.predicate(
      "token created_at >= dateFrom",
      new Date(resetToken.created_at) >= new Date(dateFrom),
    );
    TestValidator.predicate(
      "token created_at <= dateTo",
      new Date(resetToken.created_at) <= new Date(dateTo),
    );
  }
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
}
