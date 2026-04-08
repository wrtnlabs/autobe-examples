import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer address list returns empty result for new customer.
 *
 * Validates that a newly registered customer with no saved shipping addresses receives a properly formatted empty paginated response. This test ensures the address listing endpoint correctly handles the edge case of zero records while maintaining valid pagination metadata.
 *
 * The test verifies the complete response structure including empty data array and accurate pagination counts when no addresses exist for the customer.
 *
 * 1. Customer authenticates via join endpoint with generated credentials.
 * 2. Customer connection is created with authentication token.
 * 3. Address list endpoint is called with default pagination parameters.
 * 4. Response is validated to ensure empty data array.
 * 5. Pagination metadata is verified with records=0, pages=0, current=1, limit=20.
 */
export async function test_api_customer_address_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. List addresses (customer has none)
  const addresses: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {} satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(addresses);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", addresses.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", addresses.pagination.current, 1);
  TestValidator.equals("limit is 20 (default)", addresses.pagination.limit, 20);
  TestValidator.equals("total records is 0", addresses.pagination.records, 0);
  TestValidator.equals("total pages is 0", addresses.pagination.pages, 0);
}
