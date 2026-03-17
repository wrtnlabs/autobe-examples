import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test successful password reset token listing for security auditing purposes.
 *
 * Authenticates as a customer and queries the password reset tokens endpoint
 * without filters to retrieve the most recent activity. Validates that the API
 * returns a paginated list with proper structure including UUID format IDs and
 * ISO 8601 timestamps.
 */
export async function test_api_password_reset_token_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as customer to establish session
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Query password reset tokens endpoint without filters
  const response =
    await api.functional.ecommerceMall.customer.password_resets.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceMallSellerPasswordReset.IRequest,
      },
    );
  // 3. Validate complete response structure including pagination and data types
  typia.assert(response);
}
