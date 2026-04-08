import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_customer_addresses_create } from "../../../generate/generate_random_ecommerce_mall_member_customer_addresses_create";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

export async function test_api_order_items_view_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const memberData = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(memberData);
  // 2. Create shipping address for order
  const address =
    await generate_random_ecommerce_mall_member_customer_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          street: RandomGenerator.alphabets(10),
          city: RandomGenerator.alphabets(5),
          state: RandomGenerator.alphabets(6),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: RandomGenerator.alphabets(2).toUpperCase(),
          is_default: true,
        },
      },
    );
  typia.assert(address);
  // 3. Create order with multiple items (different statuses simulated)
  // Note: Order items will initially all be 'paid' status
  // We create one order with multiple items to test filtering
  const order1 = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order1);
  // Store product variant IDs from order items for filtering tests
  const variantIds = order1.items.map((item) => item.id);
  const order2 = await generate_random_ecommerce_mall_member_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
            >(),
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      },
    },
  );
  typia.assert(order2);
  // 4. Test basic listing (no filters)
  const basicList = await api.functional.ecommerceMall.member.order_items.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(basicList);
  TestValidator.equals("basic list has items", basicList.data.length, 3);
  TestValidator.equals(
    "basic list pagination records",
    basicList.pagination.records,
    3,
  );
  TestValidator.equals(
    "basic list current page",
    basicList.pagination.current,
    1,
  );
  // 5. Test filtering by status='paid'
  const paidFilter =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          status: "paid",
        },
      },
    );
  typia.assert(paidFilter);
  TestValidator.equals(
    "paid filter returns all items",
    paidFilter.data.length,
    3,
  );
  paidFilter.data.forEach((item) => {
    TestValidator.equals(`item ${item.id} status is paid`, item.status, "paid");
  });
  // 6. Test filtering by order_id (only order1 items)
  const order1Filter =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          order_id: order1.id,
        },
      },
    );
  typia.assert(order1Filter);
  TestValidator.equals(
    "order1 filter returns 2 items",
    order1Filter.data.length,
    2,
  );
  order1Filter.data.forEach((item) => {
    TestValidator.equals(
      "item belongs to order1",
      item.order_number,
      order1.order_number,
    );
  });
  // 7. Test filtering by product_variant_id (first order item id)
  const productVariantId = order1.items[0].id;
  const variantFilter =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          product_variant_id: productVariantId,
        },
      },
    );
  typia.assert(variantFilter);
  TestValidator.equals(
    "variant filter returns 1 item",
    variantFilter.data.length,
    1,
  );
  // 8. Test sorting by quantity
  const quantitySort =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          order_by: "quantity",
          order_direction: "DESC",
        },
      },
    );
  typia.assert(quantitySort);
  TestValidator.predicate("quantity sorted DESC", () => {
    for (let i = 1; i < quantitySort.data.length; i++) {
      if (quantitySort.data[i - 1].quantity < quantitySort.data[i].quantity) {
        return false;
      }
    }
    return true;
  });
  // 9. Test sorting by unit_price
  const priceSort = await api.functional.ecommerceMall.member.order_items.index(
    customerConnection,
    {
      body: {
        order_by: "unit_price",
        order_direction: "ASC",
      },
    },
  );
  typia.assert(priceSort);
  TestValidator.predicate("unit_price sorted ASC", () => {
    for (let i = 1; i < priceSort.data.length; i++) {
      if (priceSort.data[i - 1].unit_price > priceSort.data[i].unit_price) {
        return false;
      }
    }
    return true;
  });
  // 10. Test pagination metadata
  const paginatedList =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          limit: 2,
          page: "1",
        },
      },
    );
  typia.assert(paginatedList);
  TestValidator.equals(
    "paginated list limit",
    paginatedList.pagination.limit,
    2,
  );
  TestValidator.equals(
    "paginated list current",
    paginatedList.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated list records",
    paginatedList.pagination.records,
    3,
  );
  TestValidator.equals(
    "paginated list pages",
    paginatedList.pagination.pages,
    2,
  );
  // 11. Test empty result case
  const emptyFilter =
    await api.functional.ecommerceMall.member.order_items.index(
      customerConnection,
      {
        body: {
          status: "delivered",
        },
      },
    );
  typia.assert(emptyFilter);
  TestValidator.equals("empty filter has no items", emptyFilter.data.length, 0);
  TestValidator.equals(
    "empty filter records",
    emptyFilter.pagination.records,
    0,
  );
  TestValidator.equals("empty filter pages", emptyFilter.pagination.pages, 0);
}
