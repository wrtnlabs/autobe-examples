import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryLog";
import type { IPageIShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCartItemOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemOption";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_cart } from "../../../prepare/prepare_random_shopping_mall_cart";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_history_access_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin actor (elevated privileges)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminRegistration = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: adminRegistration.token.access,
    },
  };
  // 2. Set up seller actor (owner of the target variant)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerRegistration = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const sellerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: sellerRegistration.token.access,
    },
  };
  // 3. Create product variant owned by seller as seller actor
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerAuthConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<10>
            >(),
            options: [{ option_name: "Color", option_value: "Red" }],
          },
        ] satisfies IShoppingMallProductVariant.ICreate[],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Extract variant ID from product creation response
  // The SDK returns IShoppingMallCustomer type but we need variant details
  // We'll use a type-safe approach with typed property access
  const variant = (product as any).variants?.[0];
  if (!variant || !variant.id) throw new Error("Failed to extract variant ID");
  const variantId = variant.id;
  // 4. Seller triggers manual adjustment (loss) on owned variant
  await api.functional.shoppingMall.seller.inventory.adjust(
    sellerAuthConnection,
    {
      variantId: variantId,
      body: {
        change_quantity: -7,
        reason: "loss",
        reference_id: null,
        notes: "Damaged during shipping",
      } satisfies IShoppingMallInventoryLog,
    },
  );
  // 5. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerRegistration = await authorize_customer_join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  const customerAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: customerRegistration.token.access,
    },
  };
  // 6. Customer adds variant to cart
  await api.functional.shoppingMall.customer.cart.create(
    customerAuthConnection,
    {
      body: {
        variant_id: variantId,
        quantity: 1,
      } satisfies IShoppingMallCart.ICreate,
    },
  );
  // 7. Simulate checkout by sending PATCH to items endpoint with status=paid
  // This triggers order item creation → system generates inventory log with reason="order"
  const randomOrderId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.shoppingMall.customer.orders.items.index(
    customerAuthConnection,
    {
      orderId: randomOrderId,
      body: { status: "paid" },
    },
  );
  // 8. Admin retrieves inventory history for the variant - should see ALL events regardless of ownership
  const adminHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      adminAuthConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(adminHistory);
  // 9. Validate all expected event types exist in admin's inventory history
  const reasons = adminHistory.data.map((log) => log.reason);
  TestValidator.predicate(
    "inventory history contains 'loss' event",
    reasons.includes("loss"),
  );
  TestValidator.predicate(
    "inventory history contains 'order' event",
    reasons.includes("order"),
  );
  // Expect exactly 2 entries: one from seller adjustment, one from system order
  TestValidator.equals(
    "inventory history has exactly 2 entries",
    adminHistory.data.length,
    2,
  );
  // Validate series of events: loss (-7), order (-1)
  const changes = adminHistory.data.map((log) => log.change_quantity);
  TestValidator.equals("first event is loss: -7", changes[0], -7);
  TestValidator.equals("second event is order: -1", changes[1], -1);
  // Validate admin can access all logs, while seller cannot access logs of other sellers' variants
  const sellerHistory =
    await api.functional.shoppingMall.seller.inventory.history.index(
      sellerAuthConnection,
      {
        variantId: variantId,
      },
    );
  typia.assert(sellerHistory);
  TestValidator.equals(
    "seller sees only one event (loss) on own variant",
    sellerHistory.data.length,
    1,
  );
  // Lastly, validate ordering: newest first (DESC)
  const orderLog = adminHistory.data.find((log) => log.reason === "order");
  const lossLog = adminHistory.data.find((log) => log.reason === "loss");
  if (!orderLog || !lossLog) throw new Error("Could not identify logs");
  // Order log created after loss → should appear first in DESC order
  TestValidator.equals(
    "order log appears first in history",
    adminHistory.data.indexOf(orderLog),
    0,
  );
  TestValidator.equals(
    "loss log appears second",
    adminHistory.data.indexOf(lossLog),
    1,
  );
}
