import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate payment method detail visibility after deletion.
 *
 * Business goal: Ensure that once a platform administrator deletes a payment
 * method configuration, the detail endpoint can no longer retrieve it and
 * consistently fails for subsequent calls, reflecting a hard-delete or
 * non-visible state for removed configurations.
 *
 * Scenario steps:
 *
 * 1. Register a platform administrator using POST /auth/platformAdmin/join.
 *
 *    - This issues an authorized platform admin session and JWT token.
 * 2. Create a new payment method using POST
 *    /shoppingMall/platformAdmin/paymentMethods.
 *
 *    - Capture the returned IShoppingMallPaymentMethod and its id.
 *    - Validate the response shape with typia.assert.
 * 3. Fetch the payment method detail once using GET
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId} to confirm it
 *    exists before deletion.
 * 4. Delete the payment method using DELETE
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId}.
 * 5. Attempt to fetch the same payment method detail again multiple times.
 *
 *    - Each invocation must result in an error, confirming that deleted
 *         configurations are no longer retrievable.
 *
 * This test focuses on lifecycle behavior and does not assert any specific HTTP
 * status codes, only that an error is thrown when attempting to access a
 * deleted payment method.
 */
export async function test_api_payment_method_detail_after_soft_delete(
  connection: api.IConnection,
) {
  // 1. Register platform administrator (join)
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new payment method as the authenticated platform admin
  const createBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: `provider_${RandomGenerator.alphaNumeric(6)}`,
    method_type: RandomGenerator.pick([
      "card",
      "bank",
      "wallet",
      "offline",
    ] as const),
    currency_restriction: null,
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
  typia.assert<IShoppingMallPaymentMethod>(created);

  // Basic sanity checks on the created entity
  TestValidator.predicate(
    "created payment method id should be non-empty UUID string",
    typeof created.id === "string" && created.id.length > 0,
  );
  TestValidator.equals(
    "created code matches request",
    created.code,
    createBody.code,
  );

  // 3. Fetch detail before deletion to confirm existence
  const beforeDelete: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.at(
      connection,
      {
        paymentMethodId: created.id,
      },
    );
  typia.assert<IShoppingMallPaymentMethod>(beforeDelete);
  TestValidator.equals(
    "detail before deletion should refer to same id",
    beforeDelete.id,
    created.id,
  );

  // 4. Delete the payment method
  await api.functional.shoppingMall.platformAdmin.paymentMethods.erase(
    connection,
    {
      paymentMethodId: created.id,
    },
  );

  // 5. Verify that subsequent detail calls now fail with an error.
  //    We do not assert on specific HTTP status codes, only that
  //    an error is thrown, indicating non-visibility of deleted records.

  // Single check immediately after deletion
  await TestValidator.error(
    "detail after deletion should throw error",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentMethods.at(
        connection,
        {
          paymentMethodId: created.id,
        },
      );
    },
  );

  // Stability check: multiple repeated calls must continue to fail
  await ArrayUtil.asyncRepeat(2, async (index) => {
    await TestValidator.error(
      `repeated detail after deletion call #${index + 1} should throw error`,
      async () => {
        await api.functional.shoppingMall.platformAdmin.paymentMethods.at(
          connection,
          {
            paymentMethodId: created.id,
          },
        );
      },
    );
  });
}
