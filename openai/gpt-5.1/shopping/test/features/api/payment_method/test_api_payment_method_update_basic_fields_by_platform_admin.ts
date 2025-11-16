import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform admin can update basic editable fields of a payment
 * method.
 *
 * Business workflow:
 *
 * 1. Join as a new platform admin and establish authenticated context.
 * 2. Create a payment method configuration as that admin.
 * 3. Update its basic mutable fields (display_name, description, priority) via
 *    PUT.
 * 4. Verify identity fields (id, code, method_type, created_at) are preserved.
 * 5. Verify updated fields and audit-related fields (updated_at, updated_by_admin)
 *    behave as expected.
 * 6. Perform a second partial update that only changes priority and confirm other
 *    fields remain unchanged.
 */
export async function test_api_payment_method_update_basic_fields_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new payment method
  const createBody = {
    code: `code_${RandomGenerator.alphaNumeric(8)}`,
    display_name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: `provider_${RandomGenerator.alphaNumeric(6)}`,
    method_type: RandomGenerator.pick([
      "card",
      "bank",
      "wallet",
      "offline",
    ] as const),
    currency_restriction: null,
    min_amount: 1000,
    max_amount: 1000000,
    priority: 10 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Snapshot of original values
  const originalId = created.id;
  const originalCode = created.code;
  const originalMethodType = created.method_type;
  const originalCreatedAt = created.created_at;
  const originalPriority = created.priority;

  // 3. First update: change display_name, description, priority
  const updatedDisplayName = RandomGenerator.name(3);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedPriority = (originalPriority + 5) as number & tags.Type<"int32">;

  const updateBody1 = {
    display_name: updatedDisplayName,
    description: updatedDescription,
    priority: updatedPriority,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated1: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody1,
      },
    );
  typia.assert(updated1);

  // 4. Validate identity fields are unchanged
  TestValidator.equals(
    "payment method id must remain unchanged after update",
    updated1.id,
    originalId,
  );
  TestValidator.equals(
    "payment method code must remain unchanged after update",
    updated1.code,
    originalCode,
  );
  TestValidator.equals(
    "payment method method_type must remain unchanged after update",
    updated1.method_type,
    originalMethodType,
  );
  TestValidator.equals(
    "payment method created_at must remain unchanged after update",
    updated1.created_at,
    originalCreatedAt,
  );

  // 5. Validate updated fields
  TestValidator.equals(
    "payment method display_name should be updated",
    updated1.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "payment method description should be updated",
    updated1.description,
    updatedDescription,
  );
  TestValidator.equals(
    "payment method priority should be updated",
    updated1.priority,
    updatedPriority,
  );

  // Audit fields: updated_at should be >= created_at
  TestValidator.predicate(
    "updated_at must be equal or later than created_at",
    () => {
      const createdTime = Date.parse(originalCreatedAt);
      const updatedTime = Date.parse(updated1.updated_at);
      return (
        !Number.isNaN(createdTime) &&
        !Number.isNaN(updatedTime) &&
        updatedTime >= createdTime
      );
    },
  );

  // updated_by_admin when present should reflect the same admin
  if (updated1.updated_by_admin !== undefined) {
    typia.assert(updated1.updated_by_admin);
    TestValidator.equals(
      "updated_by_admin.id should match current admin id when present",
      updated1.updated_by_admin.id,
      adminAuthorized.id,
    );
    TestValidator.equals(
      "updated_by_admin.email should match current admin email when present",
      updated1.updated_by_admin.email,
      adminAuthorized.email,
    );
  }

  // 6. Second update: only adjust priority to ensure partial updates work
  const secondPriority = (updatedPriority + 1) as number & tags.Type<"int32">;
  const updateBody2 = {
    priority: secondPriority,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated2: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody2,
      },
    );
  typia.assert(updated2);

  // Validate that only priority changed (display_name and description stay from first update)
  TestValidator.equals(
    "second update should keep display_name from first update",
    updated2.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "second update should keep description from first update",
    updated2.description,
    updatedDescription,
  );
  TestValidator.equals(
    "second update should change priority again",
    updated2.priority,
    secondPriority,
  );

  // Identity fields remain stable after second update as well
  TestValidator.equals(
    "payment method id must remain unchanged after second update",
    updated2.id,
    originalId,
  );
  TestValidator.equals(
    "payment method code must remain unchanged after second update",
    updated2.code,
    originalCode,
  );
  TestValidator.equals(
    "payment method method_type must remain unchanged after second update",
    updated2.method_type,
    originalMethodType,
  );
}
