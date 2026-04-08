import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_order_snapshots_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate administrator
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.ecommerceMall.auth.administrator.join(
    adminConnection,
    {
      body: {
        display_name: RandomGenerator.name(2),
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        grade: "regular" as const,
      } satisfies IEcommerceMallAdministrator.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 3. Create product as seller (category validation handled by backend)
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create product variant as seller
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: typia.random<string & tags.MinLength<1>>(),
          option_values: JSON.stringify({
            color: typia.random<string & tags.MinLength<1>>(),
            size: typia.random<string & tags.MinLength<1>>(),
          }),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Create and authenticate customer
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: customerPassword,
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customer);
  // 6. Create order as customer (creates snapshots)
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 7. Login as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.administrator.login(
    adminLoginConnection,
    {
      body: {
        email: admin.email,
        password: adminPassword,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallAdministrator.ILogin,
    },
  );
  // 8. List order snapshots with pagination
  const response =
    await api.functional.ecommerceMall.administrator.order_snapshots.index(
      adminLoginConnection,
      {
        body: {} satisfies IEcommerceMallOrderSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 9. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records is at least 1",
    response.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages is at least 1",
    response.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "current page is within bounds",
    response.pagination.current <= response.pagination.pages,
  );
  // 10. Validate snapshot data exists and has required fields
  TestValidator.predicate(
    "snapshots array has at least one item",
    response.data.length >= 1,
  );
  const snapshot = response.data[0];
  typia.assert(snapshot);
  // 11. Validate snapshot has all required fields with non-null checks
  TestValidator.equals(
    "order_number is string",
    typeof snapshot.order_number,
    "string",
  );
  TestValidator.equals(
    "order_date is string",
    typeof snapshot.order_date,
    "string",
  );
  TestValidator.equals(
    "customer_name is string",
    typeof snapshot.customer_name,
    "string",
  );
  TestValidator.equals(
    "customer_phone is string",
    typeof snapshot.customer_phone,
    "string",
  );
  TestValidator.equals(
    "shipping_recipient_name is string",
    typeof snapshot.shipping_recipient_name,
    "string",
  );
  TestValidator.equals(
    "shipping_phone is string",
    typeof snapshot.shipping_phone,
    "string",
  );
  TestValidator.equals(
    "shipping_street is string",
    typeof snapshot.shipping_street,
    "string",
  );
  TestValidator.equals(
    "shipping_city is string",
    typeof snapshot.shipping_city,
    "string",
  );
  TestValidator.equals(
    "shipping_state is string",
    typeof snapshot.shipping_state,
    "string",
  );
  TestValidator.equals(
    "shipping_postal_code is string",
    typeof snapshot.shipping_postal_code,
    "string",
  );
  TestValidator.equals(
    "shipping_country is string",
    typeof snapshot.shipping_country,
    "string",
  );
  TestValidator.equals(
    "item_count is number",
    typeof snapshot.item_count,
    "number",
  );
  TestValidator.equals(
    "subtotal is number",
    typeof snapshot.subtotal,
    "number",
  );
  TestValidator.equals(
    "shipping_fee is number",
    typeof snapshot.shipping_fee,
    "number",
  );
  TestValidator.equals(
    "total_amount is number",
    typeof snapshot.total_amount,
    "number",
  );
  TestValidator.equals(
    "order_status is string",
    typeof snapshot.order_status,
    "string",
  );
  // 12. Validate snapshot numeric field values
  TestValidator.predicate("item_count is positive", snapshot.item_count > 0);
  TestValidator.predicate("subtotal is non-negative", snapshot.subtotal >= 0);
  TestValidator.predicate(
    "shipping_fee is non-negative",
    snapshot.shipping_fee >= 0,
  );
  TestValidator.predicate(
    "total_amount is positive",
    snapshot.total_amount > 0,
  );
}
