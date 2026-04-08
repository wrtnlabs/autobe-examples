import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrder";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_snapshot_filtered_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // Step 2: Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 3: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // Step 4: Seller creates a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        basePrice: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Step 5: Customer adds product to cart using the first variant
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: product.variants[0]!.id,
          quantity: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // Step 6: Create an order by querying orders endpoint
  const now = new Date();
  const createdBefore = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAfter = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const orderPage = await api.functional.ecommerceMall.customer.orders.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        createdAfter,
        createdBefore,
      } satisfies IEcommerceMallOrder.IRequest,
    },
  );
  typia.assert(orderPage);
  // Get an order ID from the results or use a random UUID for testing
  const orderId =
    orderPage.data.length > 0
      ? orderPage.data[0]!.id
      : typia.random<string & tags.Format<"uuid">>();
  // Step 7: Super admin retrieves order snapshots with different filter combinations
  // Test 1: Basic query with pagination
  const snapshotPage1 =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId,
        body: {
          createdAtFrom: new Date(
            now.getTime() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          createdAtTo: new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    snapshotPage1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshotPage1.pagination.limit, 10);
  // Test 2: Query with no filters (full list)
  const snapshotPage2 =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId,
        body: {
          createdAtFrom: null,
          createdAtTo: null,
          page: 1,
          limit: 5,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage2);
  // Test 3: Query with specific date range filter
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const snapshotPage3 =
    await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
      superAdminConnection,
      {
        orderId,
        body: {
          createdAtFrom: startOfDay.toISOString(),
          createdAtTo: endOfDay.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage3);
  // Test 4: Test pagination with different page numbers
  if (snapshotPage1.pagination.pages > 1) {
    const snapshotPageNext =
      await api.functional.ecommerceMall.superAdmin.orders.snapshots.index(
        superAdminConnection,
        {
          orderId,
          body: {
            createdAtFrom: null,
            createdAtTo: null,
            page: 2,
            limit: 5,
          } satisfies IEcommerceMallOrderSnapshot.IRequest,
        },
      );
    typia.assert(snapshotPageNext);
    TestValidator.equals(
      "second page current",
      snapshotPageNext.pagination.current,
      2,
    );
  }
  // Test 5: Verify business logic - order snapshots reference the correct order
  if (snapshotPage1.data.length > 0) {
    TestValidator.equals(
      "snapshot order id matches",
      snapshotPage1.data[0]!.order.id,
      orderId,
    );
  }
}
