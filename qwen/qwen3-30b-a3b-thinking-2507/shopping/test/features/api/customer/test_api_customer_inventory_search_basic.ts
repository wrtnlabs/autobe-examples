import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallVariantInventory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallVariantInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallVariantInventory";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_customer_inventory_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new connection for the customer
  const customerConnection: api.IConnection = { host: connection.host };
  // 2. Generate test customer data
  const email = typia.random<string & tags.Format<"email">>();
  // 3. Create customer account using utility function - added password
  const password = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(customerConnection, {
    body: {
      email,
      password,
    },
  });
  // 4. Log in as customer using utility function - removed invalid properties
  await authorize_member_login(customerConnection, {
    body: {
      email,
    },
  });
  // 5. Search inventory with product name matching
  const inventory =
    await api.functional.shoppingMall.customer.search.inventory.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          search: "test",
          sort_by: "name",
          order: "asc",
        } satisfies IShoppingMallVariantInventory.IRequest,
      },
    );
  // 6. Validate response structure and content
  typia.assert(inventory);
  TestValidator.equals("pagination current", inventory.pagination.current, 1);
  TestValidator.equals("pagination limit", inventory.pagination.limit, 10);
  TestValidator.predicate(
    "should have inventory items",
    inventory.data.length > 0,
  );
}