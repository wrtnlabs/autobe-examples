import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRefundPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundPolicy";

/**
 * Validate creation of a minimal refund policy using only required fields.
 *
 * Business goal: Platform administrators should be able to quickly create a
 * simple, globally applicable refund policy without having to configure all
 * advanced options. This test verifies that providing only the core required
 * fields in IShoppingMallRefundPolicy.ICreate is sufficient to persist a valid
 * policy and that the core fields are echoed back correctly in the created
 * entity.
 *
 * Steps:
 *
 * 1. Join as a new platform administrator via POST /auth/platformAdmin/join.
 * 2. Using the authenticated admin connection, call POST
 *    /shoppingMall/platformAdmin/refundPolicies with an
 *    IShoppingMallRefundPolicy.ICreate body that populates only required
 *    properties and omits all optional fields.
 * 3. Assert that the created IShoppingMallRefundPolicy matches the core fields
 *    from the request and that numeric constraints (like refund window and max
 *    refund rate) satisfy expected ranges.
 */
export async function test_api_refund_policy_creation_with_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish auth context
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional; omit it for minimal create
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  TestValidator.predicate("platform admin should be active", admin.isActive);

  // 2. Create a refund policy with only required fields populated
  const refundWindowDays: number & tags.Type<"int32"> & tags.Minimum<0> =
    typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>();

  const maxRefundRate: number = 0.8; // within [0,1]

  const createBody = {
    code: `POLICY_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    allowFullRefund: true,
    allowPartialRefund: true,
    refundWindowDays,
    maxRefundRate,
    isActive: true,
    // omit all optional fields: description, requireManualApprovalOverAmount,
    // configurationPayload, effectiveFrom, effectiveUntil, regionCode,
    // policySettingCode
  } satisfies IShoppingMallRefundPolicy.ICreate;

  const created: IShoppingMallRefundPolicy =
    await api.functional.shoppingMall.platformAdmin.refundPolicies.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // 3. Core field equality checks between request and created entity
  TestValidator.equals(
    "refund policy code should match input",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "refund policy name should match input",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "allowFullRefund should match input",
    created.allowFullRefund,
    createBody.allowFullRefund,
  );
  TestValidator.equals(
    "allowPartialRefund should match input",
    created.allowPartialRefund,
    createBody.allowPartialRefund,
  );
  TestValidator.equals(
    "isActive flag should match input",
    created.isActive,
    createBody.isActive,
  );

  // Map refundWindowDays (ICreate) to maxDaysAfterDelivery (entity)
  TestValidator.equals(
    "refund window days should be reflected as maxDaysAfterDelivery",
    created.maxDaysAfterDelivery,
    refundWindowDays,
  );

  TestValidator.equals(
    "maxRefundRate should match input",
    created.maxRefundRate,
    maxRefundRate,
  );

  // 4. Business-level constraints on numeric fields
  await TestValidator.predicate(
    "maxRefundRate should be between 0 and 1",
    () =>
      created.maxRefundRate !== undefined
        ? created.maxRefundRate >= 0 && created.maxRefundRate <= 1
        : maxRefundRate >= 0 && maxRefundRate <= 1,
  );

  await TestValidator.predicate(
    "refund window should be non-negative",
    () =>
      created.maxDaysAfterDelivery === undefined ||
      created.maxDaysAfterDelivery >= 0,
  );
}
