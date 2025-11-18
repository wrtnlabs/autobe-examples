import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate creation of account risk flags per actor_type variant.
 *
 * Business goal: Ensure that an authenticated shopping mall admin can create
 * IShoppingMallAccountRiskFlag records targeting all supported actor_type
 * categories ("customer", "seller", "admin", "guestuser"), and that the
 * actor_type and code fields are persisted and returned exactly as requested.
 *
 * Steps:
 *
 * 1. Join an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context (SDK: api.functional.auth.admin.join).
 * 2. Define a table of actor_type variants with distinct machine-readable codes
 *    and severities.
 * 3. For each actor_type entry: 3-1. Call POST
 *    /shoppingMall/admin/accountRiskFlags (SDK:
 *    api.functional.shoppingMall.admin.accountRiskFlags.create) with an
 *    IShoppingMallAccountRiskFlag.ICreate body containing: - actor_type:
 *    current variant - code: unique code per variant - reason: human-readable
 *    explanation text - severity: appropriate value such as "low", "medium",
 *    "high", or "critical" - active: true - expires_at: either omitted or set
 *    to a valid ISO date-time string 3-2. Assert the response type using
 *    typia.assert. 3-3. Use TestValidator.equals to validate that actor_type
 *    and code in the response match the request body values for each created
 *    flag.
 *
 * Notes:
 *
 * - The SDK list does not expose a GET-by-id endpoint for
 *   shopping_mall_account_risk_flags, so the test validates persistence
 *   semantics through the immediate create response only.
 */
export async function test_api_account_risk_flag_creation_per_actor_type_variants(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Define actor_type variants with distinct codes and severities
  const variants = [
    {
      actor_type: "customer",
      code: "CUSTOMER_HIGH_REFUND_RATE",
      severity: "high",
    },
    {
      actor_type: "seller",
      code: "SELLER_SUSPICIOUS_LISTINGS",
      severity: "critical",
    },
    {
      actor_type: "admin",
      code: "ADMIN_POLICY_VIOLATION",
      severity: "medium",
    },
    {
      actor_type: "guestuser",
      code: "GUEST_SUSPICIOUS_BEHAVIOR",
      severity: "low",
    },
  ] as const;

  // 3. For each variant, create a risk flag and validate response
  await ArrayUtil.asyncForEach(variants, async (variant, index) => {
    const reason = RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 8,
    });

    // Make some variants time-bounded and others non-expiring to
    // exercise the nullable expires_at field.
    const expires_at: (string & tags.Format<"date-time">) | null =
      index % 2 === 0
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;

    const createBody = {
      actor_type: variant.actor_type,
      code: variant.code,
      reason,
      severity: variant.severity,
      active: true,
      expires_at,
    } satisfies IShoppingMallAccountRiskFlag.ICreate;

    const created: IShoppingMallAccountRiskFlag =
      await api.functional.shoppingMall.admin.accountRiskFlags.create(
        connection,
        {
          body: createBody,
        },
      );

    typia.assert(created);

    // Validate actor_type and code echo back correctly
    TestValidator.equals(
      `actor_type should match for variant ${variant.actor_type}`,
      created.actor_type,
      createBody.actor_type,
    );

    TestValidator.equals(
      `code should match for variant ${variant.actor_type}`,
      created.code,
      createBody.code,
    );

    // Validate severity and active as additional business checks
    TestValidator.equals(
      `severity should match for variant ${variant.actor_type}`,
      created.severity,
      createBody.severity,
    );

    TestValidator.equals(
      `active should be true for variant ${variant.actor_type}`,
      created.active,
      createBody.active,
    );

    // Confirm that expires_at respects the nullable contract
    TestValidator.equals(
      `expires_at should match for variant ${variant.actor_type}`,
      created.expires_at ?? null,
      createBody.expires_at ?? null,
    );
  });
}
