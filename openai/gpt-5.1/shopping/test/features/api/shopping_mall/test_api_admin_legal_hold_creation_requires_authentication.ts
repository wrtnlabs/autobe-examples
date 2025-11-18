import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Verify that creating a legal hold requires admin authentication.
 *
 * Business goals:
 *
 * - Ensure POST /shoppingMall/admin/legalHolds is protected by admin auth.
 * - Unauthenticated requests must be rejected with 401/403.
 * - Authenticated admin can successfully create a legal hold.
 * - The created legal hold reflects the input payload and is associated with the
 *   creating admin.
 *
 * Workflow:
 *
 * 1. Build a valid IShoppingMallLegalHold.ICreate payload.
 * 2. Create an unauthenticated connection (empty headers) and attempt to create a
 *    legal hold, expecting an HTTP auth error.
 * 3. Join an admin using POST /auth/admin/join to establish an authenticated
 *    context on the original connection.
 * 4. Retry the same legal hold creation with the authenticated connection,
 *    asserting success and payload consistency.
 */
export async function test_api_admin_legal_hold_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Prepare a deterministic, valid legal hold creation payload.
  const uniqueCodeSuffix: string = RandomGenerator.alphaNumeric(12);
  const legalHoldBody = {
    code: `e2e-legal-hold-${uniqueCodeSuffix}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 5 }),
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  // 2. Unauthenticated connection: clone base connection but drop headers.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Attempt to create a legal hold without authentication and expect
  //    an HTTP error related to missing/invalid auth (401 or 403).
  await TestValidator.httpError(
    "unauthenticated legal hold creation must fail",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.admin.legalHolds.create(unauthConn, {
        body: legalHoldBody,
      });
    },
  );

  // 4. Join as an admin to establish authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Authenticated legal hold creation must succeed.
  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert<IShoppingMallLegalHold>(created);

  // 6. Business-level validations: ensure created record reflects input
  //    and is associated with the creating admin.
  TestValidator.equals(
    "legal hold code should match request body",
    created.code,
    legalHoldBody.code,
  );
  TestValidator.equals(
    "legal hold title should match request body",
    created.title,
    legalHoldBody.title,
  );
  TestValidator.equals(
    "legal hold status should match request body",
    created.status,
    legalHoldBody.status,
  );

  if (
    legalHoldBody.description !== null &&
    legalHoldBody.description !== undefined
  ) {
    TestValidator.equals(
      "legal hold description should match when provided",
      created.description,
      legalHoldBody.description,
    );
  }
  if (
    legalHoldBody.scope_description !== null &&
    legalHoldBody.scope_description !== undefined
  ) {
    TestValidator.equals(
      "legal hold scope_description should match when provided",
      created.scope_description,
      legalHoldBody.scope_description,
    );
  }
  if (
    legalHoldBody.external_reference !== null &&
    legalHoldBody.external_reference !== undefined
  ) {
    TestValidator.equals(
      "legal hold external_reference should match when provided",
      created.external_reference,
      legalHoldBody.external_reference,
    );
  }
  if (
    legalHoldBody.effective_from !== null &&
    legalHoldBody.effective_from !== undefined
  ) {
    TestValidator.equals(
      "legal hold effective_from should match when provided",
      created.effective_from,
      legalHoldBody.effective_from,
    );
  }

  // 7. Validate that the creating admin is recorded correctly.
  TestValidator.equals(
    "created_by_admin_id should equal authenticated admin id",
    created.created_by_admin_id,
    adminAuthorized.id,
  );
}
