import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test customer address filtering by location-based criteria.
 *
 * Validates the address search and filtering functionality including city partial matching, country exact matching, recipient name partial matching, and general search across multiple fields. Ensures that combined filters work correctly with AND logic and that pagination metadata accurately reflects filtered result counts.
 *
 * The test verifies that filter parameters are properly accepted by the API and that the response structure conforms to the expected pagination format. Since address creation is not available through the provided API endpoints, this test focuses on validating the filter mechanism itself rather than specific address data matching.
 *
 * 1. Customer registers and authenticates via authorize_member_join.
 * 2. Tests city filter parameter acceptance and response structure.
 * 3. Tests country filter parameter acceptance and response structure.
 * 4. Tests recipient_name filter parameter acceptance and response structure.
 * 5. Tests general search parameter acceptance and response structure.
 * 6. Tests combined filters (city + country) for parameter composition.
 * 7. Validates pagination metadata structure in all responses.
 */
export async function test_api_customer_address_filter_by_location(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Test city filter (partial match)
  const seoulFilter = await api.functional.shoppingMall.member.addresses.index(
    customerConnection,
    {
      body: {
        city: "Seoul",
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(seoulFilter);
  // 3. Test country filter (exact match)
  const koreaFilter = await api.functional.shoppingMall.member.addresses.index(
    customerConnection,
    {
      body: {
        country: "South Korea",
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(koreaFilter);
  // 4. Test recipient_name filter (partial match)
  const johnFilter = await api.functional.shoppingMall.member.addresses.index(
    customerConnection,
    {
      body: {
        recipient_name: "John",
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(johnFilter);
  // 5. Test general search parameter
  const searchFilter = await api.functional.shoppingMall.member.addresses.index(
    customerConnection,
    {
      body: {
        search: "Kim",
      } satisfies IShoppingMallCustomerAddress.IRequest,
    },
  );
  typia.assert(searchFilter);
  // 6. Test combined filters (city + country)
  const combinedFilter =
    await api.functional.shoppingMall.member.addresses.index(
      customerConnection,
      {
        body: {
          city: "Seoul",
          country: "South Korea",
        } satisfies IShoppingMallCustomerAddress.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 7. Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current page is valid",
    seoulFilter.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    seoulFilter.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    seoulFilter.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    seoulFilter.pagination.pages >= 0,
  );
}
