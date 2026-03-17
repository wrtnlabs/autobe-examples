import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_checkout_complete } from "../../../generate/generate_random_shopping_mall_customer_checkout_complete";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_order_snapshot_preserved_after_product_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shopName: RandomGenerator.name(2),
      shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    },
  });
  typia.assert(seller);
  // Store seller info for validation
  const sellerShopName = seller.shop_name;
  const sellerLogoImage = seller.logo_image;
  // 2. Create product with seller
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          basePrice: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        },
      },
    );
  typia.assert(product);
  // 3. Customer setup - register and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {});
  typia.assert(customer);
  // 4. Create shipping address for customer
  const address = await generate_random_shopping_mall_customer_addresses_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        phoneNumber: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.name(1),
        stateProvince: RandomGenerator.name(1),
        postalCode: RandomGenerator.alphaNumeric(6),
        country: RandomGenerator.pick(["USA", "Korea", "Japan", "UK"]),
      },
    },
  );
  typia.assert(address);
  // 5. Complete checkout to create order and snapshot
  const order = await generate_random_shopping_mall_customer_checkout_complete(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  typia.assert(order);
  // Get order item ID from the order
  const orderItem = order.orderItems[0];
  typia.assert(orderItem);
  // Store snapshot data before deletion for comparison
  const snapshotBeforeDeletion = orderItem.snapshot;
  typia.assert(snapshotBeforeDeletion);
  // 6. Seller deletes the product
  await api.functional.shoppingMall.seller.products.erase(sellerConnection, {
    productId: product.id,
    body: {
      reason: "Product discontinued for testing snapshot preservation",
    } satisfies IShoppingMallProduct.IErase,
  });
  // 7. Customer retrieves the snapshot after product deletion
  const snapshotAfterDeletion =
    await api.functional.shoppingMall.customer.orders.items.snapshot.at(
      customerConnection,
      {
        orderId: order.id,
        itemId: orderItem.id,
      },
    );
  typia.assert(snapshotAfterDeletion);
  // 8. Validate snapshot is preserved correctly after product deletion
  TestValidator.equals(
    "snapshot productName preserved after product deletion",
    snapshotAfterDeletion.productName,
    snapshotBeforeDeletion.productName,
  );
  TestValidator.equals(
    "snapshot productDescription preserved after product deletion",
    snapshotAfterDeletion.productDescription,
    snapshotBeforeDeletion.productDescription,
  );
  TestValidator.equals(
    "snapshot price preserved after product deletion",
    snapshotAfterDeletion.price,
    snapshotBeforeDeletion.price,
  );
  TestValidator.equals(
    "snapshot sellerShopName preserved after product deletion",
    snapshotAfterDeletion.sellerShopName,
    snapshotBeforeDeletion.sellerShopName,
  );
  TestValidator.equals(
    "snapshot sellerLogoImage preserved after product deletion",
    snapshotAfterDeletion.sellerLogoImage,
    snapshotBeforeDeletion.sellerLogoImage,
  );
  // Validate variantOptions count matches
  TestValidator.equals(
    "snapshot variantOptions count preserved",
    snapshotAfterDeletion.variantOptions.length,
    snapshotBeforeDeletion.variantOptions.length,
  );
  // Validate each variant option is preserved
  snapshotBeforeDeletion.variantOptions.forEach((option, index) => {
    TestValidator.equals(
      `variant option key ${index} preserved`,
      snapshotAfterDeletion.variantOptions[index].optionKey,
      option.optionKey,
    );
    TestValidator.equals(
      `variant option value ${index} preserved`,
      snapshotAfterDeletion.variantOptions[index].optionValue,
      option.optionValue,
    );
  });
}
