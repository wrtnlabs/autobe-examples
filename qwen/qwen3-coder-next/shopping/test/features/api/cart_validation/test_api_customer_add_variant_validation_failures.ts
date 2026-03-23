import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";

export async function test_api_customer_add_variant_validation_failures(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create authenticated customer connection
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>() as string & tags.MinLength<1> & tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(16);
  const registered = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(registered);
  // Test 1: Quantity=0 should fail
  await TestValidator.error("quantity cannot be zero", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 0,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // Test 2: Negative quantity should fail
  await TestValidator.error("quantity cannot be negative", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: -1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // Test 3: Non-existent variant ID should fail
  await TestValidator.error("non-existent variant ID", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // Test 4: Deleted variant should fail
  await TestValidator.error("deleted variant", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // Test 5: Variant from suspended seller should fail
  await TestValidator.error("variant from suspended seller", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
  // Test 6: Quantity exceeds stock should fail
  await TestValidator.error("exceeds available stock", async () => {
    await api.functional.ecommerceMall.customer.cart.items.create(
      customerConnection,
      {
        body: {
          variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 10000,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  });
}