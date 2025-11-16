import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that updating a payment method's code to an already-used value is
 * rejected due to uniqueness constraints on `code`.
 *
 * Business flow:
 *
 * 1. A platform admin joins and becomes authenticated.
 * 2. The admin creates two payment methods: one with code "primary_method",
 *    another with code "secondary_method".
 * 3. The admin attempts to update the second payment method so that its `code`
 *    becomes "primary_method".
 * 4. The update must fail with an HttpError (4xx client error), proving that the
 *    `code` field enforces uniqueness on update just like on create.
 * 5. The test ensures that the failed update does not mutate any local payment
 *    method objects and that both original records remain logically distinct.
 */
export async function test_api_payment_method_update_code_uniqueness_violation(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin (authentication & token setup).
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create first payment method with code "primary_method".
  const createPrimaryBody = {
    code: "primary_method",
    display_name: "Primary Method",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_primary",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const primary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createPrimaryBody },
    );
  typia.assert<IShoppingMallPaymentMethod>(primary);

  // 3. Create second payment method with code "secondary_method".
  const createSecondaryBody = {
    code: "secondary_method",
    display_name: "Secondary Method",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_secondary",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 2 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const secondary =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createSecondaryBody },
    );
  typia.assert<IShoppingMallPaymentMethod>(secondary);

  // Sanity check: distinct ids and codes.
  TestValidator.notEquals(
    "primary and secondary payment methods must have different ids",
    primary.id,
    secondary.id,
  );
  TestValidator.notEquals(
    "primary and secondary payment methods must have different codes",
    primary.code,
    secondary.code,
  );

  // Snapshot original codes for later comparison.
  const originalPrimaryCode: string = primary.code;
  const originalSecondaryCode: string = secondary.code;

  // 4. Attempt to update secondary method to duplicate code "primary_method".
  const duplicateUpdateBody = {
    code: "primary_method",
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  await TestValidator.error(
    "updating payment method to duplicate code must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
        connection,
        {
          paymentMethodId: secondary.id,
          body: duplicateUpdateBody,
        },
      );
    },
  );

  // 5. Verify that in-memory objects still retain their original codes.
  TestValidator.equals(
    "primary payment method code remains unchanged after failed update",
    primary.code,
    originalPrimaryCode,
  );
  TestValidator.equals(
    "secondary payment method code remains unchanged after failed update",
    secondary.code,
    originalSecondaryCode,
  );
}
