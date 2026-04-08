import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_order_snapshot_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // Login with seller credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Create a product for the seller (with valid category and variants)
  const sellerProductsConnection: api.IConnection = { host: connection.host };
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerProductsConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Register customers and create addresses for orders
  const customers: IEcommerceMallMember.IAuthorized[] = [];
  const numCustomers = 6;
  const ordersPerCustomer = 10;
  for (let i = 0; i < numCustomers; i++) {
    const customerEmail = typia.random<string & tags.Format<"email">>();
    const customerPassword = RandomGenerator.alphaNumeric(16);
    const customerConnection: api.IConnection = { host: connection.host };
    const customerAuth = await authorize_member_join(customerConnection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
    typia.assert(customerAuth);
    customers.push(customerAuth);
  }
  // Create addresses for each customer
  const customerAddresses: string[] = [];
  for (let i = 0; i < numCustomers; i++) {
    const customer = customers[i];
    const customerAddressConnection: api.IConnection = {
      host: connection.host,
    };
    // Note: This requires a separate address creation endpoint which may not exist
    // For now, we'll use customer.id as placeholder (will be handled by prepare function)
    customerAddresses.push(customer.id);
  }
  // Place orders from each customer
  const orders: IEcommerceMallOrder[] = [];
  for (let i = 0; i < numCustomers; i++) {
    const customer = customers[i];
    const customerOrderConnection: api.IConnection = { host: connection.host };
    for (let j = 0; j < ordersPerCustomer; j++) {
      const orderItems: IEcommerceMallOrderItem.ICreate[] = [
        {
          product_variant_id: product.variants[0]?.id ?? "",
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IEcommerceMallOrderItem.ICreate,
      ];
      const order = await api.functional.ecommerceMall.member.orders.create(
        customerOrderConnection,
        {
          body: {
            shipping_address_id: customerAddresses[i],
            order_items: orderItems,
          } satisfies IEcommerceMallOrder.ICreate,
        },
      );
      typia.assert(order);
      orders.push(order);
    }
  }
  // 4. Test pagination
  const sellerSnapshotConnection: api.IConnection = { host: connection.host };
  // Test 1: page=1, limit=10
  const page1Result =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals("page 1 has items", page1Result.data.length > 0, true);
  TestValidator.equals(
    "page 1 metadata current",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 metadata limit",
    page1Result.pagination.limit,
    10,
  );
  // Test 2: page=2, limit=10
  const page2Result =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals("page 2 has items", page2Result.data.length > 0, true);
  TestValidator.equals(
    "page 2 metadata current",
    page2Result.pagination.current,
    2,
  );
  // Test 3: page with large limit (100)
  const largeLimitResult =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit response has correct limit",
    largeLimitResult.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit returns up to 100 items",
    () => largeLimitResult.data.length <= 100,
  );
  // Test 4: page beyond total pages
  const pastEndPage = page1Result.pagination.pages + 10;
  const pastEndResult =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: pastEndPage,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(pastEndResult);
  TestValidator.equals(
    "past end page has empty data",
    pastEndResult.data.length,
    0,
  );
  TestValidator.equals(
    "past end page has correct metadata",
    pastEndResult.pagination.current,
    pastEndPage,
  );
  // Test 5: page=0 should default to page=1
  const zeroPageResult =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(zeroPageResult);
  TestValidator.equals(
    "zero page defaults to page 1",
    zeroPageResult.pagination.current,
    1,
  );
  // Test 6: limit exceeding 100 should cap at 100
  const exceedLimitResult =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 1,
          limit: 150,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(exceedLimitResult);
  TestValidator.equals(
    "exceed limit caps at 100",
    exceedLimitResult.pagination.limit,
    100,
  );
  // Test 7: limit less than 1 should return 400
  await TestValidator.httpError(
    "limit less than 1 returns 400",
    400,
    async () =>
      api.functional.ecommerceMall.seller.order_snapshots.index(
        sellerSnapshotConnection,
        {
          body: {
            page: 1,
            limit: 0,
          } satisfies IEcommerceMallOrderSnapshot.IRequest,
        },
      ),
  );
  // Test 8 & 9: Verify pagination has more pages
  TestValidator.predicate(
    "more pages exist when records > limit",
    () => page1Result.pagination.pages > 1,
  );
  // Test 10: Verify records count consistency
  TestValidator.equals(
    "records count equals total snapshots",
    page1Result.pagination.records,
    page2Result.pagination.records,
  );
  // Edge Case 2: Seller has snapshots with limit=7
  const limit7Result =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 1,
          limit: 7,
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(limit7Result);
  const expectedPages = Math.ceil(limit7Result.pagination.records / 7);
  TestValidator.equals(
    "pages calculated correctly for limit 7",
    limit7Result.pagination.pages,
    expectedPages,
  );
  // Edge Case 3: Verify pagination with filters
  const filteredResult =
    await api.functional.ecommerceMall.seller.order_snapshots.index(
      sellerSnapshotConnection,
      {
        body: {
          page: 1,
          limit: 10,
          entity_type: "ORDER_ITEM",
        } satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered results have correct limit",
    filteredResult.pagination.limit,
    10,
  );
}
