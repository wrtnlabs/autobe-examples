import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate behavior of updating a payment method that has been deleted.
 *
 * Business flow:
 *
 * 1. Join a platform admin via POST /auth/platformAdmin/join.
 * 2. Create a payment method via POST /shoppingMall/platformAdmin/paymentMethods.
 * 3. Delete the payment method via DELETE
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId}.
 * 4. Attempt to update the same payment method via PUT
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId}.
 * 5. Assert that the update operation fails for the deleted payment method.
 */
export async function test_api_payment_method_update_soft_deleted_behavior(
  connection: api.IConnection,
) {
  // 1. Join a platform admin and obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a new payment method configuration.
  const methodTypeOptions = ["card", "bank", "wallet", "offline"] as const;
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_key: RandomGenerator.alphaNumeric(10),
    method_type: RandomGenerator.pick(methodTypeOptions),
    currency_restriction: "KRW,USD",
    min_amount: null,
    max_amount: null,
    priority: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Delete the payment method.
  await api.functional.shoppingMall.platformAdmin.paymentMethods.erase(
    connection,
    {
      paymentMethodId: created.id,
    },
  );

  // 4. Attempt to update the deleted payment method.
  const updateBody = {
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    is_active: false,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  await TestValidator.error("cannot update erased payment method", async () => {
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody,
      },
    );
  });
}
