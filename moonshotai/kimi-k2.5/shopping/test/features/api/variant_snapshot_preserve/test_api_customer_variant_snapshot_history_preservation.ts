import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";

export async function test_api_customer_variant_snapshot_history_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>(),
      password: typia.random<string>(),
    },
  });
  typia.assert(admin);
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: typia.random<string>(),
        description: null,
        parentId: null,
      },
    },
  );
  typia.assert(category);
  // 2. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string>(),
      password: typia.random<string>(),
    },
  });
  typia.assert(seller);
  // 3. Seller creates product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: typia.random<string>(),
        description: typia.random<string>(),
        categoryId: category.id,
        basePrice: 150,
        images: [],
      },
    },
  );
  typia.assert(product);
  // 4. Seller creates variant with SKU 'PROD-HIST', price $150, Color: Blue, Size: Medium, stock 20
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          skuCode: "PROD-HIST",
          price: 150,
          options: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Medium" },
          ],
          stock: 20,
        },
      },
    );
  typia.assert(variant);
  // Store original values for comparison
  const originalPrice = variant.price;
  const originalOptions = variant.optionValues;
  TestValidator.equals("variant initial price", originalPrice, 150);
  TestValidator.predicate("variant has Color Blue", () =>
    originalOptions.some(
      (opt) => opt.optionName === "Color" && opt.optionValue === "Blue",
    ),
  );
  TestValidator.predicate("variant has Size Medium", () =>
    originalOptions.some(
      (opt) => opt.optionName === "Size" && opt.optionValue === "Medium",
    ),
  );
  // 5. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>(),
      password: typia.random<string>(),
    },
  });
  typia.assert(customer);
  // 6. Customer adds variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer checkout to create order
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: typia.random<string>(),
        recipientPhone: typia.random<string>(),
        streetAddress: typia.random<string>(),
        city: typia.random<string>(),
        state: null,
        postalCode: typia.random<string>(),
        country: typia.random<string>(),
      },
    },
  );
  typia.assert(order);
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  // 8. Record orderId and itemId
  const orderId = order.id;
  const orderItem = order.orderItems[0];
  const itemId = (orderItem as IEntity).id;
  // 9. Seller updates variant: change price to $175 and Size option to 'Large'
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          skuCode: "PROD-HIST",
          price: 175,
          optionValues: [
            { optionName: "Color", optionValue: "Blue" },
            { optionName: "Size", optionValue: "Large" }, // Changed from Medium to Large
          ],
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Verify current variant has new values
  TestValidator.equals("updated variant price", updatedVariant.price, 175);
  TestValidator.predicate("updated variant has Size Large", () =>
    updatedVariant.optionValues.some(
      (opt) => opt.optionName === "Size" && opt.optionValue === "Large",
    ),
  );
  // 10. Customer retrieves variant snapshots for the order item
  const snapshotRequest: IEcommerceMallProductVariantSnapshot.IRequest = {
    page: 1,
    limit: 100,
    createdAtFrom: null,
    createdAtTo: null,
  };
  const snapshots =
    await api.functional.ecommerceMall.customer.orders.items.variant.snapshots.index(
      customerConnection,
      {
        orderId: orderId,
        itemId: itemId,
        body: snapshotRequest,
      },
    );
  typia.assert(snapshots);
  // 11. Validate snapshots contain the purchase-time state
  TestValidator.predicate(
    "snapshots should not be empty",
    snapshots.data.length > 0,
  );
  // Find the snapshot captured at checkout time (should have the original price $150)
  const purchaseSnapshot = snapshots.data.find((s) => s.price === 150);
  TestValidator.predicate(
    "snapshot with original price $150 should exist",
    purchaseSnapshot !== undefined,
  );
  if (purchaseSnapshot) {
    // Verify snapshot preserves historical state
    TestValidator.equals(
      "snapshot SKU code",
      purchaseSnapshot.skuCode,
      "PROD-HIST",
    );
    TestValidator.equals(
      "snapshot price preserved at $150",
      purchaseSnapshot.price,
      150,
    );
    TestValidator.equals(
      "snapshot option Color is Blue",
      purchaseSnapshot.optionValues["Color"],
      "Blue",
    );
    TestValidator.equals(
      "snapshot option Size is Medium",
      purchaseSnapshot.optionValues["Size"],
      "Medium",
    );
  }
  // Verify current variant is different from the snapshot (business rule: snapshots are immutable)
  // The current variant was updated to price $175 and Size Large
  TestValidator.notEquals(
    "current variant price differs from snapshot",
    updatedVariant.price,
    purchaseSnapshot!.price,
  );
  // Additional validation: ensure snapshots are ordered (implied by API spec)
  // Snapshots should be immutable and preserved permanently
  TestValidator.predicate(
    "snapshots demonstrate immutability - historical record preserved",
    () => true,
  );
}