import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate successful deletion of a freshly created payment method by a
 * platform admin.
 *
 * Business context:
 *
 * - Payment methods are global configuration records that only platform
 *   administrators can manage.
 * - A new method is created with a valid configuration and marked active.
 * - The same admin then deletes this method using the DELETE endpoint.
 *
 * Steps implemented:
 *
 * 1. Join as a new platformAdmin using /auth/platformAdmin/join, obtaining an
 *    authorized admin session.
 * 2. Under this authenticated admin context, create a new payment method with a
 *    realistic configuration via /shoppingMall/platformAdmin/paymentMethods
 *    (ICreate).
 * 3. Verify that the returned payment method echoes key configuration fields and
 *    provides a concrete UUID id.
 * 4. Call DELETE /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId} for
 *    that id.
 * 5. Treat successful completion (no HttpError) as proof of successful deletion,
 *    since the SDK does not expose status/body for void responses.
 *
 * Notes:
 *
 * - We do not perform a follow-up GET/list verification because no such endpoint
 *   is provided in the current SDK.
 * - We avoid any type-error or invalid-request testing; this is purely a
 *   happy-path deletion scenario.
 */
export async function test_api_payment_method_delete_success_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "P@ssw0rd!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  TestValidator.predicate(
    "platform admin account should be active after join",
    admin.isActive === true,
  );

  // 2. Create a new payment method configuration under this admin context
  const paymentMethodCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_key: RandomGenerator.alphaNumeric(12),
    method_type: "card",
    currency_restriction: null,
    min_amount: 1000,
    max_amount: 1000000,
    priority: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: paymentMethodCreateBody,
      },
    );
  typia.assert(created);

  // Validate that key configuration fields match the creation payload
  TestValidator.equals(
    "created payment method code should match input",
    created.code,
    paymentMethodCreateBody.code,
  );
  TestValidator.equals(
    "created payment method display_name should match input",
    created.display_name,
    paymentMethodCreateBody.display_name,
  );
  TestValidator.equals(
    "created payment method provider_key should match input",
    created.provider_key,
    paymentMethodCreateBody.provider_key,
  );
  TestValidator.equals(
    "created payment method method_type should match input",
    created.method_type,
    paymentMethodCreateBody.method_type,
  );
  TestValidator.equals(
    "created payment method is_active should match input",
    created.is_active,
    paymentMethodCreateBody.is_active,
  );
  TestValidator.equals(
    "created payment method min_amount should match input",
    created.min_amount,
    paymentMethodCreateBody.min_amount,
  );
  TestValidator.equals(
    "created payment method max_amount should match input",
    created.max_amount,
    paymentMethodCreateBody.max_amount,
  );

  // 3. Delete the created payment method
  await api.functional.shoppingMall.platformAdmin.paymentMethods.erase(
    connection,
    {
      paymentMethodId: created.id,
    },
  );

  // If no HttpError was thrown, treat this as a successful deletion.
}
