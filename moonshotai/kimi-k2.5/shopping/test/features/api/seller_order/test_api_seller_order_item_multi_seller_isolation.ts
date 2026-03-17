import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";

interface IOrderItemWithSeller extends IEcommerceMallOrderItem {
  id: string;
  seller: { id: string };
}

export async function test_api_seller_order_item_multi_seller_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create categories
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Create categories for both sellers
  const categoryA =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  const categoryB =
    await generate_random_ecommerce_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
        },
      },
    );
  // 2. Seller A setup - create seller, register, and approve
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerAConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Get seller A ID from registration
  const authorizedSellerA =
    await api.functional.ecommerceMall.auth.seller.login(sellerAConnection, {
      body: {
        email: sellerAEmail,
        password: sellerAPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  const sellerAId = authorizedSellerA.id;
  // Submit registration for Seller A
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerAConnection,
    {
      body: {
        taxIdentificationNumber: typia.random<string>(),
        businessRegistrationNumber: typia.random<string>(),
        businessName: RandomGenerator.name(),
        businessAddress: RandomGenerator.paragraph(),
        reason: RandomGenerator.paragraph(),
      },
    },
  );
  // Approve Seller A
  await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
    adminConnection,
    {
      sellerId: sellerAId,
      body: {
        approvalStatus: "approved",
      } satisfies IEcommerceMallSeller.IUpdateStatus,
    },
  );
  // Create Seller A's product and variant
  const productA = await generate_random_ecommerce_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        categoryId: categoryA.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      },
    },
  );
  const variantA =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerAConnection,
      {
        params: { productId: productA.id },
        body: {
          skuCode: `SKU-A-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Red",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price:
            productA.basePrice +
            typia.random<number & tags.Minimum<10> & tags.Maximum<100>>(),
          stock: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  // 3. Seller B setup - create seller, register, and approve
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerBConnection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Get seller B ID
  const authorizedSellerB =
    await api.functional.ecommerceMall.auth.seller.login(sellerBConnection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  const sellerBId = authorizedSellerB.id;
  // Submit registration for Seller B
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerBConnection,
    {
      body: {
        taxIdentificationNumber: typia.random<string>(),
        businessRegistrationNumber: typia.random<string>(),
        businessName: RandomGenerator.name(),
        businessAddress: RandomGenerator.paragraph(),
        reason: RandomGenerator.paragraph(),
      },
    },
  );
  // Approve Seller B
  await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
    adminConnection,
    {
      sellerId: sellerBId,
      body: {
        approvalStatus: "approved",
      } satisfies IEcommerceMallSeller.IUpdateStatus,
    },
  );
  // Create Seller B's product and variant
  const productB = await generate_random_ecommerce_mall_seller_products_create(
    sellerBConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        categoryId: categoryB.id,
        basePrice: typia.random<
          number & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      },
    },
  );
  const variantB =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerBConnection,
      {
        params: { productId: productB.id },
        body: {
          skuCode: `SKU-B-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
          options: [
            {
              optionName: "Color",
              optionValue: "Blue",
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price:
            productB.basePrice +
            typia.random<number & tags.Minimum<10> & tags.Maximum<100>>(),
          stock: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  // 4. Customer setup - add items from both sellers to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Add Seller A's variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantA.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  // Add Seller B's variant to cart
  await generate_random_ecommerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        productVariantId: variantB.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      },
    },
  );
  // Checkout creates order with items from both sellers
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.paragraph(),
        city: RandomGenerator.name(),
        state: RandomGenerator.name(),
        postalCode: typia.random<string>(),
        country: "USA",
      },
    },
  );
  // Get order items from the order
  const orderItems = order.orderItems as IOrderItemWithSeller[];
  // Find order items for each seller
  const sellerAItem = orderItems.find((item) => item.seller.id === sellerAId);
  const sellerBItem = orderItems.find((item) => item.seller.id === sellerBId);
  if (!sellerAItem || !sellerBItem) {
    throw new Error("Expected to find order items for both sellers");
  }
  // 5. Verify Seller A can access their own item
  const sellerAOwnItem =
    await api.functional.ecommerceMall.seller.orders.items.at(
      sellerAConnection,
      {
        orderId: order.id,
        itemId: sellerAItem.id,
      },
    ) as IOrderItemWithSeller;
  typia.assert(sellerAOwnItem);
  TestValidator.equals(
    "Seller A's item belongs to Seller A",
    sellerAOwnItem.seller.id,
    sellerAId,
  );
  // 6. Verify Seller A CANNOT access Seller B's item (should get 403)
  await TestValidator.httpError(
    "Seller A cannot access Seller B's order item",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.at(
        sellerAConnection,
        {
          orderId: order.id,
          itemId: sellerBItem.id,
        },
      );
    },
  );
  // 7. Verify Seller B can access their own item
  const sellerBOwnItem =
    await api.functional.ecommerceMall.seller.orders.items.at(
      sellerBConnection,
      {
        orderId: order.id,
        itemId: sellerBItem.id,
      },
    ) as IOrderItemWithSeller;
  typia.assert(sellerBOwnItem);
  TestValidator.equals(
    "Seller B's item belongs to Seller B",
    sellerBOwnItem.seller.id,
    sellerBId,
  );
  // 8. Verify Seller B CANNOT access Seller A's item (should get 403)
  await TestValidator.httpError(
    "Seller B cannot access Seller A's order item",
    403,
    async () => {
      await api.functional.ecommerceMall.seller.orders.items.at(
        sellerBConnection,
        {
          orderId: order.id,
          itemId: sellerAItem.id,
        },
      );
    },
  );
}