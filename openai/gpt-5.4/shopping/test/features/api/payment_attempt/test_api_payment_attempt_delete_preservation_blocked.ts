import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAttempt";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_payment_attempts_create } from "../../../generate/generate_random_shopping_mall_customer_payment_attempts_create";
import { generate_random_shopping_mall_customer_shipping_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_shipping_addresses_create";
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_payment_attempt } from "../../../prepare/prepare_random_shopping_mall_payment_attempt";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_shipping_address } from "../../../prepare/prepare_random_shopping_mall_shipping_address";

export async function test_api_payment_attempt_delete_preservation_blocked(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  const shippingAddress =
    await generate_random_shopping_mall_customer_shipping_addresses_create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 4 }),
          city: RandomGenerator.name(1),
          state_province: RandomGenerator.name(1),
          postal_code: RandomGenerator.alphaNumeric(8),
          country: RandomGenerator.name(1),
          is_default: true,
        } satisfies IShoppingMallShippingAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  const cartItem =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          shopping_mall_product_id: product.id,
          shopping_mall_product_variant_id: variant.id,
          quantity: 1,
        } satisfies IShoppingMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  const paymentAttempt =
    await generate_random_shopping_mall_customer_payment_attempts_create(
      customerConnection,
      {
        body: {
          amount: cartItem.subtotal,
          gateway_provider: "test_gateway",
        } satisfies IShoppingMallPaymentAttempt.ICreate,
      },
    );
  typia.assert(paymentAttempt);
  const finalizedAt = new Date().toISOString();
  const finalized =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {
          status: "succeeded",
          gateway_provider: paymentAttempt.gateway_provider,
          gateway_reference: `preserved-${RandomGenerator.alphaNumeric(12)}`,
          failure_reason: null,
          processed_at: finalizedAt,
        } satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(finalized);
  TestValidator.equals(
    "payment attempt id preserved after finalization",
    finalized.id,
    paymentAttempt.id,
  );
  TestValidator.equals(
    "payment attempt customer preserved after finalization",
    finalized.customer.id,
    customerAuth.id,
  );
  TestValidator.equals(
    "payment attempt amount preserved after finalization",
    finalized.amount,
    paymentAttempt.amount,
  );
  TestValidator.equals(
    "payment attempt status finalized",
    finalized.status,
    "succeeded",
  );
  TestValidator.equals(
    "payment attempt failure reason cleared",
    finalized.failure_reason,
    null,
  );
  TestValidator.equals(
    "payment attempt deleted_at remains null before delete",
    finalized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "payment attempt processed_at exists after finalization",
    finalized.processed_at !== null,
  );
  let deleteError: api.HttpError | null = null;
  try {
    await api.functional.shoppingMall.customer.paymentAttempts.erase(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
      },
    );
  } catch (exp) {
    if (exp instanceof api.HttpError) deleteError = exp;
    else throw exp;
  }
  TestValidator.predicate(
    "customer delete request is rejected",
    deleteError !== null,
  );
  TestValidator.predicate(
    "delete rejection is not an authorization failure",
    deleteError !== null &&
      deleteError.status !== 401 &&
      deleteError.status !== 403,
  );
  const preserved =
    await api.functional.shoppingMall.customer.paymentAttempts.update(
      customerConnection,
      {
        paymentAttemptId: paymentAttempt.id,
        body: {} satisfies IShoppingMallPaymentAttempt.IUpdate,
      },
    );
  typia.assert(preserved);
  TestValidator.equals(
    "payment attempt still retrievable by id after blocked delete",
    preserved.id,
    finalized.id,
  );
  TestValidator.equals(
    "payment attempt customer unchanged after blocked delete",
    preserved.customer.id,
    finalized.customer.id,
  );
  TestValidator.equals(
    "payment attempt amount unchanged after blocked delete",
    preserved.amount,
    finalized.amount,
  );
  TestValidator.equals(
    "payment attempt status unchanged after blocked delete",
    preserved.status,
    finalized.status,
  );
  TestValidator.equals(
    "payment attempt gateway provider unchanged after blocked delete",
    preserved.gateway_provider,
    finalized.gateway_provider,
  );
  TestValidator.equals(
    "payment attempt gateway reference unchanged after blocked delete",
    preserved.gateway_reference,
    finalized.gateway_reference,
  );
  TestValidator.equals(
    "payment attempt failure reason unchanged after blocked delete",
    preserved.failure_reason,
    finalized.failure_reason,
  );
  TestValidator.equals(
    "payment attempt processed_at unchanged after blocked delete",
    preserved.processed_at,
    finalized.processed_at,
  );
  TestValidator.equals(
    "payment attempt deleted_at still null after blocked delete",
    preserved.deleted_at,
    null,
  );
  TestValidator.equals(
    "preserved evidence still tied to original customer",
    preserved.customer.id,
    customerAuth.id,
  );
}
