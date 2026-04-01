import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";

export async function test_api_customer_address_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins the platform
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create 5 shipping addresses for the customer
  const addresses: IShoppingMallAddress[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const address =
        await generate_random_shopping_mall_customer_addresses_create(
          customerConnection,
          {
            body: {
              isDefault: index === 0,
            } satisfies Partial<IShoppingMallAddress.ICreate>,
          },
        );
      return address;
    },
  );
  // Validate all addresses were created successfully
  for (const address of addresses) {
    typia.assert(address);
    TestValidator.equals(
      "address customer matches",
      address.customer.id,
      customer.id,
    );
  }
  // 3. Request address list without filters (page 1, default limit)
  const page1Response =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(page1Response);
  // 4. Verify pagination metadata
  TestValidator.equals("page 1 current", page1Response.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 10);
  TestValidator.equals(
    "page 1 total records",
    page1Response.pagination.records,
    5,
  );
  TestValidator.equals("page 1 total pages", page1Response.pagination.pages, 1);
  // 5. Verify all 5 addresses are returned
  TestValidator.equals("page 1 address count", page1Response.data.length, 5);
  // 6. Verify each address has all required fields and is not soft-deleted
  const createdAddressIds = new Set(addresses.map((a) => a.id));
  let defaultAddressCount = 0;
  for (const addressSummary of page1Response.data) {
    typia.assert(addressSummary);
    TestValidator.predicate(
      "address not soft-deleted",
      addressSummary.deletedAt === null,
    );
    TestValidator.predicate(
      "address exists in created list",
      createdAddressIds.has(addressSummary.id),
    );
    // Count default addresses
    if (addressSummary.isDefault) {
      defaultAddressCount++;
    }
    // Verify all required fields are present
    TestValidator.predicate(
      "has recipient name",
      addressSummary.recipientName.length > 0,
    );
    TestValidator.predicate(
      "has recipient phone",
      addressSummary.recipientPhone.length > 0,
    );
    TestValidator.predicate(
      "has street address",
      addressSummary.streetAddress.length > 0,
    );
    TestValidator.predicate("has city", addressSummary.city.length > 0);
    TestValidator.predicate("has state", addressSummary.state.length > 0);
    TestValidator.predicate(
      "has postal code",
      addressSummary.postalCode.length > 0,
    );
    TestValidator.predicate("has country", addressSummary.country.length > 0);
  }
  // 7. Verify exactly one address is marked as default
  TestValidator.equals("exactly one default address", defaultAddressCount, 1);
  // 8. Verify sorting by created_at descending (newest first)
  for (let i = 1; i < page1Response.data.length; i++) {
    const prevDate = new Date(page1Response.data[i - 1].createdAt).getTime();
    const currDate = new Date(page1Response.data[i].createdAt).getTime();
    TestValidator.predicate(
      `sorted descending at index ${i}`,
      prevDate >= currDate,
    );
  }
  // 9. Test pagination with page 2 and limit=2
  const page2Response =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 2,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(page2Response);
  // 10. Verify page 2 pagination metadata
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 2);
  TestValidator.equals(
    "page 2 total records",
    page2Response.pagination.records,
    5,
  );
  TestValidator.equals("page 2 total pages", page2Response.pagination.pages, 3);
  // 11. Verify page 2 contains correct number of addresses (2 addresses)
  TestValidator.equals("page 2 address count", page2Response.data.length, 2);
  // 12. Verify page 2 addresses are different from page 1
  const page1Ids = page1Response.data.map((a) => a.id);
  const page2Ids = page2Response.data.map((a) => a.id);
  for (const page2Id of page2Ids) {
    TestValidator.predicate(
      "page 2 address not in page 1",
      !page1Ids.includes(page2Id),
    );
  }
  // 13. Test page 3 with limit=2 (should have 1 address)
  const page3Response =
    await api.functional.shoppingMall.customer.addresses.index(
      customerConnection,
      {
        body: {
          page: 3,
          limit: 2,
        } satisfies IShoppingMallAddress.IRequest,
      },
    );
  typia.assert(page3Response);
  TestValidator.equals("page 3 current", page3Response.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3Response.pagination.limit, 2);
  TestValidator.equals("page 3 address count", page3Response.data.length, 1);
  // 14. Verify all pages together contain all 5 unique addresses
  const allIds = [
    ...page1Ids,
    ...page2Ids,
    ...page3Response.data.map((a) => a.id),
  ];
  TestValidator.equals("total unique addresses", new Set(allIds).size, 5);
}
