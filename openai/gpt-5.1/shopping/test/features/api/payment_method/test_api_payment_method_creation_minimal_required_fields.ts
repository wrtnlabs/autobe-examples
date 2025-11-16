import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate minimal required-fields creation of a payment method by a platform
 * admin.
 *
 * Business goal: Ensure that a freshly joined platform administrator can create
 * a shopping mall payment method using only the required fields of
 * IShoppingMallPaymentMethod.ICreate, and that the backend populates
 * system-managed fields and optional properties behave as expected when
 * omitted.
 *
 * Steps:
 *
 * 1. Join as a new platform admin via /auth/platformAdmin/join to obtain an
 *    authenticated admin session.
 * 2. Call POST /shoppingMall/platformAdmin/paymentMethods with a body that only
 *    sets required fields in IShoppingMallPaymentMethod.ICreate.
 * 3. Validate the response structure and echo semantics.
 * 4. Validate behavior of omitted optional fields and audit fields.
 */
export async function test_api_payment_method_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin to obtain an authenticated session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build minimal IShoppingMallPaymentMethod.ICreate payload
  const createBody = {
    code: `card_${RandomGenerator.alphaNumeric(8)}`,
    display_name: "Credit Card",
    provider_key: "default_provider",
    method_type: "card",
    priority: 10,
    is_active: true,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Basic echo validations for required fields
  TestValidator.equals(
    "payment method code should echo request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "payment method display_name should echo request",
    created.display_name,
    createBody.display_name,
  );
  TestValidator.equals(
    "payment method provider_key should echo request",
    created.provider_key,
    createBody.provider_key,
  );
  TestValidator.equals(
    "payment method method_type should echo request",
    created.method_type,
    createBody.method_type,
  );
  TestValidator.equals(
    "payment method priority should echo request",
    created.priority,
    createBody.priority,
  );
  TestValidator.equals(
    "payment method is_active should echo request",
    created.is_active,
    createBody.is_active,
  );

  // 4. ID should be a valid UUID
  const createdId = typia.assert<string & tags.Format<"uuid">>(created.id);
  TestValidator.equals(
    "payment method id should be same as created.id after uuid assertion",
    created.id,
    createdId,
  );

  // 5. Optional fields omitted in request should be null or undefined
  TestValidator.predicate(
    "description is null or undefined when omitted",
    created.description === null || created.description === undefined,
  );
  TestValidator.predicate(
    "currency_restriction is null or undefined when omitted",
    created.currency_restriction === null ||
      created.currency_restriction === undefined,
  );
  TestValidator.predicate(
    "min_amount is null or undefined when omitted",
    created.min_amount === null || created.min_amount === undefined,
  );
  TestValidator.predicate(
    "max_amount is null or undefined when omitted",
    created.max_amount === null || created.max_amount === undefined,
  );
  TestValidator.predicate(
    "starts_at is null or undefined when omitted",
    created.starts_at === null || created.starts_at === undefined,
  );
  TestValidator.predicate(
    "ends_at is null or undefined when omitted",
    created.ends_at === null || created.ends_at === undefined,
  );

  // 6. deleted_at should be null or undefined for fresh record
  TestValidator.predicate(
    "deleted_at is null or undefined for newly created payment method",
    created.deleted_at === null || created.deleted_at === undefined,
  );

  // 7. created_at and updated_at should be populated date-time strings
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    created.created_at,
  );
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    created.updated_at,
  );

  TestValidator.predicate("created_at is non-empty", createdAt.length > 0);
  TestValidator.predicate("updated_at is non-empty", updatedAt.length > 0);

  // Ensure timestamps are not in the far future (allow small skew)
  const now = Date.now();
  const createdTime = new Date(createdAt).getTime();
  const updatedTime = new Date(updatedAt).getTime();
  const allowedFutureSkewMs = 5 * 60 * 1000; // 5 minutes

  TestValidator.predicate(
    "created_at is not in the far future",
    createdTime <= now + allowedFutureSkewMs,
  );
  TestValidator.predicate(
    "updated_at is not in the far future",
    updatedTime <= now + allowedFutureSkewMs,
  );

  // 8. If created_by_admin is populated, it should match the joined admin
  if (
    created.created_by_admin !== undefined &&
    created.created_by_admin !== null
  ) {
    const creator = created.created_by_admin;
    TestValidator.equals(
      "created_by_admin.id matches admin.id when present",
      creator.id,
      admin.id,
    );
    TestValidator.equals(
      "created_by_admin.email matches admin.email when present",
      creator.email,
      admin.email,
    );
  }

  // 9. If updated_by_admin is populated, it should match the joined admin too
  if (
    created.updated_by_admin !== undefined &&
    created.updated_by_admin !== null
  ) {
    const updater = created.updated_by_admin;
    TestValidator.equals(
      "updated_by_admin.id matches admin.id when present",
      updater.id,
      admin.id,
    );
    TestValidator.equals(
      "updated_by_admin.email matches admin.email when present",
      updater.email,
      admin.email,
    );
  }
}
