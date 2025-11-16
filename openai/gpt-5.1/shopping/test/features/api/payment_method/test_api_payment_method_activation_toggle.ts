import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that a platform administrator can toggle a payment method's activation
 * status using the update endpoint, and that changes are persisted correctly
 * while other fields remain unchanged when not included in the update payload.
 *
 * Business flow:
 *
 * 1. Join as a platform admin via POST /auth/platformAdmin/join.
 * 2. Create a payment method with is_active=false using POST
 *    /shoppingMall/platformAdmin/paymentMethods.
 * 3. Update the payment method via PUT
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId} to set
 *    is_active=true.
 * 4. Assert that is_active flips to true, id stays the same, and updated_at is
 *    later than the original value while core fields like code and display_name
 *    remain unchanged.
 * 5. Toggle back to is_active=false and repeat assertions to confirm bidirectional
 *    toggling.
 */
export async function test_api_payment_method_activation_toggle(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a payment method starting as inactive
  const createBody = {
    code: `pm_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    provider_key: "provider_main_gateway",
    method_type: RandomGenerator.pick([
      "card",
      "bank",
      "wallet",
      "offline",
    ] as const),
    currency_restriction: "KRW,USD",
    min_amount: 1000,
    max_amount: 1000000,
    priority: 10,
    is_active: false,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  TestValidator.equals(
    "created payment method should be inactive initially",
    created.is_active,
    false,
  );

  const originalId = created.id;
  const originalCode = created.code;
  const originalDisplayName = created.display_name;
  const originalUpdatedAt = created.updated_at;

  // 3. Toggle is_active to true via update
  const activateBody = {
    is_active: true,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const activated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: activateBody,
      },
    );
  typia.assert(activated);

  TestValidator.equals(
    "activation toggle should set is_active to true",
    activated.is_active,
    true,
  );
  TestValidator.equals(
    "payment method id should remain stable on activation",
    activated.id,
    originalId,
  );
  TestValidator.equals(
    "code should remain unchanged on activation",
    activated.code,
    originalCode,
  );
  TestValidator.equals(
    "display_name should remain unchanged on activation",
    activated.display_name,
    originalDisplayName,
  );

  const activatedUpdatedAt = activated.updated_at;
  TestValidator.predicate(
    "updated_at must advance on activation",
    new Date(activatedUpdatedAt).getTime() >
      new Date(originalUpdatedAt).getTime(),
  );

  // 4. Toggle back to inactive (false) and verify again
  const deactivateBody = {
    is_active: false,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const deactivated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: deactivateBody,
      },
    );
  typia.assert(deactivated);

  TestValidator.equals(
    "deactivation toggle should set is_active to false",
    deactivated.is_active,
    false,
  );
  TestValidator.equals(
    "payment method id should remain stable on deactivation",
    deactivated.id,
    originalId,
  );
  TestValidator.equals(
    "code should remain unchanged on deactivation",
    deactivated.code,
    originalCode,
  );
  TestValidator.equals(
    "display_name should remain unchanged on deactivation",
    deactivated.display_name,
    originalDisplayName,
  );

  const deactivatedUpdatedAt = deactivated.updated_at;
  TestValidator.predicate(
    "updated_at must advance again on deactivation",
    new Date(deactivatedUpdatedAt).getTime() >
      new Date(activatedUpdatedAt).getTime(),
  );
}
