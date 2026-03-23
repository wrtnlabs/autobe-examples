import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
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
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_order_items_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerUser = typia.random<IEcommerceMallSeller.IJoin>();
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: sellerUser,
  });
  typia.assert(sellerAuthorized);
  // Seller login
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerUser.email,
      password: sellerUser.password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 2. Seller creates a product with variants
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        is_available: true,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        variants: ArrayUtil.repeat(
          2,
          () =>
            ({
              sku_code: typia.random<string & tags.Format<"uuid">>(),
            }) satisfies IEcommerceMallProductVariant.ICreate,
        ),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Customer registration and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerUser = typia.random<IEcommerceMallCustomer.IJoin>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerUser,
  });
  typia.assert(customerAuthorized);
  // Customer login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerUser.email,
      password: customerUser.password,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 4. Customer creates an order with the seller's product
  const order = await api.functional.ecommerceMall.customer.orders.create(
    customerLoginConnection,
  );
  typia.assert(order);
  // 5. Seller retrieves order items
  const response = await api.functional.ecommerceMall.seller.orders.items.at(
    sellerLoginConnection,
    {
      orderId: order.id,
    },
  );
  typia.assert(response);
  // 6. Validate response
  TestValidator.equals(
    "pagination.current is 0",
    response.pagination.current,
    0,
  );
  TestValidator.predicate(
    "pagination.limit > 0",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination.records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages >= 0",
    response.pagination.pages >= 0,
  );
  // Check each order item has required fields
  response.data.forEach((item) => {
    TestValidator.equals(
      "item has product_name",
      typeof item.product_name,
      "string",
    );
    TestValidator.equals(
      "item has variant_options",
      typeof item.variant_options,
      "string",
    );
    TestValidator.equals(
      "item has product_price",
      typeof item.product_price,
      "number",
    );
    TestValidator.predicate(
      "item has valid item_status",
      ["paid", "shipped", "delivered", "cancelled", "refunded"].includes(
        item.item_status,
      ),
    );
    TestValidator.equals(
      "seller shop_name matches",
      item.seller.shop_name,
      sellerUser.shop_name,
    );
  });
}
