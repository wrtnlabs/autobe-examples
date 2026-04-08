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
 * Test customer address list retrieval with pagination.
 *
 * Validates that authenticated customers can retrieve their saved shipping addresses with proper pagination support. Ensures the response includes correct pagination metadata and address data conforms to the expected summary structure.
 *
 * The test verifies default pagination behavior returns addresses sorted by creation date in descending order (newest first). It also validates that pagination metadata accurately reflects the total count and page information.
 *
 * 1. Customer authenticates using join endpoint.
 * 2. Customer retrieves address list with default pagination parameters.
 * 3. Validates pagination metadata contains current page, limit, total records, and total pages.
 * 4. Validates addresses are sorted by created_at in descending order.
 */
export async function test_api_customer_address_list_with_pagination(
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
  // 2. Retrieve address list with default pagination
  const addressList: IPageIEcommerceAddress.ISummary =
    await api.functional.ecommerce.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IEcommerceAddress.IRequest,
      },
    );
  typia.assert(addressList);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", addressList.pagination.current, 1);
  TestValidator.equals("limit is 20", addressList.pagination.limit, 20);
  TestValidator.predicate(
    "total records is non-negative",
    addressList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    addressList.pagination.pages >= 0,
  );
  // 4. Validate sorting order (descending by created_at)
  if (addressList.data.length > 1) {
    for (let i = 0; i < addressList.data.length - 1; i++) {
      const current = new Date(addressList.data[i].created_at).getTime();
      const next = new Date(addressList.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `address ${i} is newer than or equal to address ${i + 1}`,
        current >= next,
      );
    }
  }
}
