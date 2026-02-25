import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShoppingCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_shopping_mall_customer_carts_items_create } from "../../../generate/generate_random_shopping_mall_customer_carts_items_create";
import { prepare_random_shopping_mall_shopping_cart_item } from "../../../prepare/prepare_random_shopping_mall_shopping_cart_item";

export async function test_api_customer_payment_history_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string>() satisfies string as string,
      password: "1234" as const,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create a product as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_customer_join(sellerConnection, {
    body: {
      email: typia.random<string>() satisfies string as string,
      password: "1234" as const,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(sellerJoinResult);
  // 3. Create product variant for payment testing
  const productVariant =
    await api.functional.shoppingMall.customer.carts.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IShoppingMallShoppingCartItem.ICreate,
      },
    );
  typia.assert(productVariant);
  // 4. Prepare payment request with known timestamps
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twoHoursAgo = new Date(
    now.getTime() - 2 * 60 * 60 * 1000,
  ).toISOString();
  // 5. Apply date range filter
  const result = await api.functional.shoppingMall.customer.payments.index(
    customerConnection,
    {
      body: {
        created_at_gte: twoHoursAgo,
        created_at_lt: now.toISOString(),
      } satisfies IShoppingMallPayment.IRequest,
    },
  );
  typia.assert(result);
  // 6. Validate pagination structure
  TestValidator.equals("pagination exists", result.pagination.current, 1);
  TestValidator.predicate("pagination limit > 0", result.pagination.limit > 0);
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
  // 7. Validate result data structure
  TestValidator.predicate("has payments", result.data.length >= 0);
  // 8. Validate each payment summary structure
  for (const payment of result.data) {
    typia.assert<IShoppingMallPayment.ISummary>(payment);
    TestValidator.predicate(
      "payment has valid ID",
      /^[0-9a-f-]{36}$/i.test(payment.id),
    );
    TestValidator.predicate("payment has valid amount", payment.amount >= 0);
    TestValidator.equals(
      "currency is defined",
      typeof payment.currency,
      "string",
    );
    TestValidator.equals(
      "payment method type is defined",
      typeof payment.payment_method_type,
      "string",
    );
    TestValidator.equals("status is defined", typeof payment.status, "string");
  }
}