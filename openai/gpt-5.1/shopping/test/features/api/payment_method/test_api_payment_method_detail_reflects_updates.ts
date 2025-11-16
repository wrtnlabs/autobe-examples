import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that payment method detail reflects configuration updates.
 *
 * Business flow:
 *
 * 1. Register a platform admin using POST /auth/platformAdmin/join.
 *
 *    - This also wires the Authorization header for subsequent calls.
 * 2. As that admin, create an initial payment method via POST
 *    /shoppingMall/platformAdmin/paymentMethods.
 * 3. Capture the created payment method's id and baseline field values.
 * 4. Update several mutable fields using PUT
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId}.
 * 5. Fetch the payment method detail using GET
 *    /shoppingMall/platformAdmin/paymentMethods/{paymentMethodId}.
 * 6. Assert that:
 *
 *    - Updated fields reflect the new values.
 *    - Fields left untouched remain identical (e.g., `code`).
 *    - `updated_at` is not earlier than `created_at`.
 *    - `created_by_admin` is populated and stable.
 *    - `updated_by_admin`, when present, corresponds to the updating admin, or at
 *         least shares the same email/id as the join response.
 */
export async function test_api_payment_method_detail_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (auth.platformAdmin.join).
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create initial payment method.
  const initialCreateBody = {
    code: `card_${RandomGenerator.alphaNumeric(6)}`,
    display_name: "Standard Card",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "provider_default",
    method_type: "card",
    currency_restriction: "KRW,USD",
    min_amount: 1000,
    max_amount: 1000000,
    priority: 10 as number & tags.Type<"int32">,
    is_active: true,
    starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: initialCreateBody },
    );
  typia.assert(created);

  // Basic sanity checks on creation output.
  TestValidator.equals(
    "created code should match input",
    created.code,
    initialCreateBody.code,
  );
  TestValidator.equals(
    "created display_name should match input",
    created.display_name,
    initialCreateBody.display_name,
  );
  if (created.created_by_admin !== undefined) {
    typia.assert<IShoppingMallPlatformAdmin.ISummary>(created.created_by_admin);
    TestValidator.equals(
      "created_by_admin.email should match join email",
      created.created_by_admin.email,
      admin.email,
    );
  }

  // 3. Prepare update payload where some fields change and some remain.
  const updatedDisplayName = "Updated Standard Card";
  const updatedDescription = RandomGenerator.paragraph({ sentences: 6 });
  const updatedPriority = 5 as number & tags.Type<"int32">;
  const updatedIsActive = false;
  const updatedMinAmount = 5000;
  const updatedMaxAmount = 500000;
  const updatedStartsAt = new Date(
    Date.now() - 2 * 60 * 60 * 1000,
  ).toISOString();
  const updatedEndsAt = new Date(
    Date.now() + 48 * 60 * 60 * 1000,
  ).toISOString();

  const updateBody = {
    // Intentionally DO NOT change `code` to check immutability in practice.
    display_name: updatedDisplayName,
    description: updatedDescription,
    provider_key: initialCreateBody.provider_key,
    method_type: initialCreateBody.method_type,
    currency_restriction: initialCreateBody.currency_restriction,
    min_amount: updatedMinAmount,
    max_amount: updatedMaxAmount,
    priority: updatedPriority,
    is_active: updatedIsActive,
    starts_at: updatedStartsAt,
    ends_at: updatedEndsAt,
  } satisfies IShoppingMallPaymentMethod.IUpdate;

  const updated: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.update(
      connection,
      {
        paymentMethodId: created.id,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Fetch detail via GET and validate.
  const fetched: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.at(
      connection,
      { paymentMethodId: created.id },
    );
  typia.assert(fetched);

  // Identity should remain stable.
  TestValidator.equals(
    "fetched id should equal created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "code should remain unchanged across updates",
    fetched.code,
    created.code,
  );

  // Updated fields should reflect new values.
  TestValidator.equals(
    "display_name should reflect update",
    fetched.display_name,
    updatedDisplayName,
  );
  TestValidator.equals(
    "description should reflect update",
    fetched.description,
    updatedDescription,
  );
  TestValidator.equals(
    "priority should reflect update",
    fetched.priority,
    updatedPriority,
  );
  TestValidator.equals(
    "is_active should reflect update",
    fetched.is_active,
    updatedIsActive,
  );
  TestValidator.equals(
    "min_amount should reflect update",
    fetched.min_amount,
    updatedMinAmount,
  );
  TestValidator.equals(
    "max_amount should reflect update",
    fetched.max_amount,
    updatedMaxAmount,
  );
  TestValidator.equals(
    "starts_at should reflect update",
    fetched.starts_at,
    updatedStartsAt,
  );
  TestValidator.equals(
    "ends_at should reflect update",
    fetched.ends_at,
    updatedEndsAt,
  );

  // Fields intentionally left unchanged should remain equal.
  TestValidator.equals(
    "provider_key should remain original",
    fetched.provider_key,
    initialCreateBody.provider_key,
  );
  TestValidator.equals(
    "method_type should remain original",
    fetched.method_type,
    initialCreateBody.method_type,
  );
  TestValidator.equals(
    "currency_restriction should remain original",
    fetched.currency_restriction,
    initialCreateBody.currency_restriction,
  );

  // Timestamp sanity: updated_at must not be earlier than created_at.
  TestValidator.predicate("updated_at is not earlier than created_at", () => {
    const createdAt = new Date(fetched.created_at).getTime();
    const updatedAt = new Date(fetched.updated_at).getTime();
    return updatedAt >= createdAt;
  });

  // created_by_admin should be stable; updated_by_admin should reflect updater when present.
  if (fetched.created_by_admin !== undefined) {
    typia.assert<IShoppingMallPlatformAdmin.ISummary>(fetched.created_by_admin);
    TestValidator.equals(
      "created_by_admin.id is stable",
      fetched.created_by_admin.id,
      created.created_by_admin?.id ?? fetched.created_by_admin.id,
    );
    TestValidator.equals(
      "created_by_admin.email should match admin email",
      fetched.created_by_admin.email,
      admin.email,
    );
  }

  if (fetched.updated_by_admin !== undefined) {
    typia.assert<IShoppingMallPlatformAdmin.ISummary>(fetched.updated_by_admin);
    TestValidator.equals(
      "updated_by_admin.email should match updating admin",
      fetched.updated_by_admin.email,
      admin.email,
    );
  }
}
