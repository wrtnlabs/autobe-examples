import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCart";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";

/**
 * Test administrator's ability to filter shopping carts by specific customer ID.
 *
 * This test verifies that the administrator cart listing endpoint correctly
 * filters carts by customer_id, ensuring that:
 * 1. Only the specified customer's carts are returned
 * 2. Other customers' carts are completely excluded
 * 3. Pagination metadata reflects the filtered result count
 * 4. Customer information in responses matches the filter criteria
 */
export async function test_api_administrator_cart_filter_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  // 2. Create Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // 3. Create Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // 4. Add cart items to Customer A's cart (creates cart if not exists)
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerAConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItemA);
  // 5. Add cart items to Customer B's cart (creates cart if not exists)
  const cartItemB =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerBConnection,
      {
        body: {
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
        },
      },
    );
  typia.assert(cartItemB);
  // 6. Administrator filters carts by Customer A's ID
  const cartsForCustomerA =
    await api.functional.shoppingMall.administrator.carts.index(
      adminConnection,
      {
        body: {
          customer_id: customerA.id,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCart.IRequest,
      },
    );
  typia.assert(cartsForCustomerA);
  // 7. Verify Customer A has at least one cart
  TestValidator.predicate(
    "Customer A has at least one cart",
    cartsForCustomerA.data.length >= 1,
  );
  // 8. Verify all returned carts belong to Customer A
  TestValidator.predicate(
    "all carts belong to Customer A",
    cartsForCustomerA.data.every((cart) => cart.customer.id === customerA.id),
  );
  // 9. Verify no carts from Customer B appear in Customer A's results
  TestValidator.predicate(
    "no Customer B carts in Customer A results",
    cartsForCustomerA.data.every((cart) => cart.customer.id !== customerB.id),
  );
  // 10. Verify pagination reflects filtered results
  TestValidator.equals(
    "pagination records match filtered count",
    cartsForCustomerA.pagination.records,
    cartsForCustomerA.data.length,
  );
  // 11. Administrator filters carts by Customer B's ID
  const cartsForCustomerB =
    await api.functional.shoppingMall.administrator.carts.index(
      adminConnection,
      {
        body: {
          customer_id: customerB.id,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallCart.IRequest,
      },
    );
  typia.assert(cartsForCustomerB);
  // 12. Verify Customer B has at least one cart
  TestValidator.predicate(
    "Customer B has at least one cart",
    cartsForCustomerB.data.length >= 1,
  );
  // 13. Verify all returned carts belong to Customer B
  TestValidator.predicate(
    "all carts belong to Customer B",
    cartsForCustomerB.data.every((cart) => cart.customer.id === customerB.id),
  );
  // 14. Verify no carts from Customer A appear in Customer B's results
  TestValidator.predicate(
    "no Customer A carts in Customer B results",
    cartsForCustomerB.data.every((cart) => cart.customer.id !== customerA.id),
  );
  // 15. Verify pagination reflects filtered results for Customer B
  TestValidator.equals(
    "pagination records match filtered count for Customer B",
    cartsForCustomerB.pagination.records,
    cartsForCustomerB.data.length,
  );
  // 16. Verify customer email matches filter criteria
  TestValidator.predicate(
    "Customer A email matches in filtered results",
    cartsForCustomerA.data.every(
      (cart) => cart.customer.email === customerA.email,
    ),
  );
  TestValidator.predicate(
    "Customer B email matches in filtered results",
    cartsForCustomerB.data.every(
      (cart) => cart.customer.email === customerB.email,
    ),
  );
}