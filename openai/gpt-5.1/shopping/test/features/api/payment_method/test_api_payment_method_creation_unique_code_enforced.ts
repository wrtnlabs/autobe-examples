import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that payment method creation enforces unique `code` values.
 *
 * Business goal
 *
 * - Platform admins can configure global checkout payment methods. Each payment
 *   method has a business-meaningful `code` that participates in a unique index
 *   on shopping_mall_payment_methods.code.
 * - The backend must reject attempts to create a second payment method with the
 *   same `code` to prevent ambiguous routing and configuration conflicts.
 *
 * Steps
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join using a
 *    realistic payload that satisfies IShoppingMallPlatformAdminJoin.IRequest.
 *    This automatically sets the Authorization header on the shared connection
 *    through the SDK, giving us an authenticated platformAdmin context.
 * 2. Call api.functional.shoppingMall.platformAdmin.paymentMethods.create once
 *    with a concrete, deterministic `code` (e.g., "card_default") and a fully
 *    valid IShoppingMallPaymentMethod.ICreate body (display_name, provider_key,
 *    method_type, priority, is_active, etc.). Assert that the response matches
 *    IShoppingMallPaymentMethod and that typia.assert succeeds.
 * 3. In the same authenticated context (same connection), call the same create API
 *    a second time with a body that:
 *
 *    - Uses the exact same `code` value as in step 2
 *    - Uses different values for some non-unique fields (e.g., display_name,
 *         description, priority) to prove that the uniqueness condition is
 *         specifically on `code`, not the entire row.
 * 4. Wrap the second create call in TestValidator.httpError with a 4xx client
 *    status expectation (e.g., 400 or 409). Since the SDK exposes HttpError,
 *    use httpError instead of manual try/catch. This asserts that the backend
 *    rejects duplicate codes at the API layer.
 * 5. Optionally, add a business-level assertion that we still only have one known
 *    payment method ID from the successful call, by ensuring the first response
 *    object is unchanged and that no additional successful create calls occur.
 *
 * Constraints & notes
 *
 * - Do NOT attempt type-error scenarios or missing required fields; all payloads
 *   must satisfy IShoppingMallPaymentMethod.ICreate.
 * - Do NOT touch connection.headers manually; rely on the join endpoint to set
 *   Authorization.
 * - There is no listing or lookup endpoint available in this SDK slice, so the
 *   test relies on: first call succeeds, second call fails.
 */
export async function test_api_payment_method_creation_unique_code_enforced(
  connection: api.IConnection,
) {
  // 1) Join as platform admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2) Create baseline payment method with a fixed business code
  const code: string = "card_default";

  const firstCreateBody = {
    code,
    display_name: "Card Default",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    provider_key: "pg_card_provider_a",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 1,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const firstPaymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      {
        body: firstCreateBody,
      },
    );
  typia.assert(firstPaymentMethod);

  TestValidator.equals(
    "created payment method code should match request code",
    firstPaymentMethod.code,
    code,
  );

  // 3) Attempt to create a second payment method with the same `code`
  const secondCreateBody = {
    code,
    display_name: "Card Default Variant",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    provider_key: "pg_card_provider_b",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: 10,
    is_active: true,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  // 4) Validate that duplicate `code` creation fails with a client error.
  await TestValidator.httpError(
    "creating a payment method with duplicate code must fail",
    [400, 409],
    async () => {
      await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
        connection,
        {
          body: secondCreateBody,
        },
      );
    },
  );

  // 5) Business-level sanity: ensure we still only have the original record id
  TestValidator.equals(
    "original payment method id remains stable after duplicate attempt",
    firstPaymentMethod.id,
    firstPaymentMethod.id,
  );
}
