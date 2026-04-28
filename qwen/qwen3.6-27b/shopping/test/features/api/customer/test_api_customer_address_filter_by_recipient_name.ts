import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Tests customer shipping address search by recipient name substring filtering.
 *
 * Validates that searching addresses with a recipient_name filter returns only addresses
 * whose recipient name contains the specified substring. Verifies pagination metadata
 * records count matches the number of returned addresses, and confirms filtering works
 * correctly by ensuring only matching addresses appear in results.
 *
 * 1. Customer registers via join authentication
 * 2. Customer searches addresses using recipient_name substring filter
 * 3. Response is validated using typia.assert
 * 4. All returned addresses have recipient names containing the filter substring
 * 5. Pagination records count equals the length of returned address data array
 */
export async function test_api_customer_address_filter_by_recipient_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authorizedCustomer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  typia.assert(authorizedCustomer);
  // 2. Define a recipient name filter substring
  const filterSubstring: string = RandomGenerator.paragraph({ sentences: 1 });
  // 3. Search addresses with recipient_name filter
  const addressesResponse =
    await api.functional.ecommercePlatform.customer.addresses.index(
      customerConnection,
      {
        body: {
          recipient_name: filterSubstring,
        } satisfies IEcommercePlatformShippingAddress.IRequest,
      },
    );
  typia.assert(addressesResponse);
  // 4. Validate all returned addresses contain filter substring in recipient_name
  const allMatched = addressesResponse.data.every((address) =>
    address.recipient_name
      .toLowerCase()
      .includes(filterSubstring.toLowerCase()),
  );
  TestValidator.predicate(
    "all returned addresses contain filter substring in recipient_name",
    allMatched,
  );
  // 5. Validate pagination records count matches returned data length
  TestValidator.equals(
    "pagination records count matches returned data length",
    addressesResponse.pagination.records,
    addressesResponse.data.length,
  );
}
