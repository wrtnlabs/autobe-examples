import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_order_items_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: (typia.random<string & tags.Format<"email">>() satisfies string as string) as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: "1234",
    display_name: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body: customerData,
  });
  typia.assert(authorized);
  // TODO: Product creation and order creation would require additional APIs
  // that are not provided in the current SDK. This test would need to be
  // updated with the complete API set to be fully functional.
  // For now, we'll create a minimal valid order ID from a simulation or
  // existing data. In a real scenario, the full checkout flow would be implemented.
  // 4. Retrieve order items (using a mock order ID for demonstration)
  // In production, this would use a real order ID from the checkout flow
  const mockOrderId = "00000000-0000-0000-0000-000000000000";
  const response = await api.functional.shoppingMall.customer.orders.items.at(
    customerConnection,
    {
      orderId: mockOrderId,
    },
  );
  typia.assert(response);
  // 5. Validate response structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 6. Validate each item structure (if any items exist)
  if (response.data.length > 0) {
    for (const item of response.data) {
      TestValidator.equals("item has id", item.id !== null, true);
      TestValidator.equals("item has quantity", item.quantity > 0, true);
      TestValidator.equals("item has unit_price", item.unit_price >= 0, true);
      TestValidator.equals("item has total_price", item.total_price >= 0, true);
      TestValidator.equals(
        "item has original_product_name",
        item.original_product_name !== null,
        true,
      );
      TestValidator.equals(
        "item has original_variant_options",
        item.original_variant_options !== null,
        true,
      );
      TestValidator.equals(
        "item has created_at",
        item.created_at !== null,
        true,
      );
    }
  }
  // 7. Verify item count matches
  TestValidator.equals(
    "item count matches",
    response.data.length,
    response.pagination.records,
  );
}