import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate that multiple admins can each create independent legal holds with
 * distinct business codes and that creator tracking fields are correctly
 * populated per hold.
 *
 * Business context:
 *
 * - Governance/compliance admins register legal holds that prevent deletion or
 *   modification of protected data.
 * - Each legal hold has a stable business `code` and is attributed to the admin
 *   who created it via `created_by_admin_id` and `created_by_admin` summary.
 * - Different admins must be able to create different holds without interfering
 *   with each other, even when using the same client connection object.
 *
 * End-to-end steps:
 *
 * 1. Admin A joins via POST /auth/admin/join and becomes the current authenticated
 *    admin on the shared connection.
 * 2. Admin A creates a legal hold A1 via POST /shoppingMall/admin/legalHolds with
 *    a unique business code (e.g., "LH-A1-{suffix}").
 * 3. Admin B joins via POST /auth/admin/join, replacing the
 *    connection.headers.Authorization with Admin B's access token.
 * 4. Admin B creates a legal hold B1 with a different business code (e.g.,
 *    "LH-B1-{suffix}").
 * 5. Verify that:
 *
 *    - Both holds were created successfully and match IShoppingMallLegalHold via
 *         typia.assert.
 *    - A1 and B1 have different `code` values.
 *    - A1.created_by_admin_id equals Admin A's id; B1.created_by_admin_id equals
 *         Admin B's id.
 *    - A1.created_by_admin summary's id and email match Admin A; B1's summary
 *         matches Admin B.
 */
export async function test_api_admin_legal_hold_creation_by_different_admins_with_distinct_codes(
  connection: api.IConnection,
) {
  // 1. Admin A joins
  const adminAJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinInput,
    });
  typia.assert(adminA);

  // 2. Admin A creates legal hold A1 with a unique code
  const randomSuffixA = RandomGenerator.alphaNumeric(8);
  const legalHoldACreateBody = {
    code: `LH-A1-${randomSuffixA}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdA1: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldACreateBody,
    });
  typia.assert(holdA1);

  // 3. Admin B joins (this call updates connection.headers.Authorization
  //    to Admin B's token internally via the SDK join implementation)
  const adminBJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinInput,
    });
  typia.assert(adminB);

  // 4. Admin B creates legal hold B1 with a different unique code
  const randomSuffixB = RandomGenerator.alphaNumeric(8);
  const legalHoldBCreateBody = {
    code: `LH-B1-${randomSuffixB}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: RandomGenerator.alphaNumeric(12),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const holdB1: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBCreateBody,
    });
  typia.assert(holdB1);

  // 5. Business assertions
  // 5-1. Codes are distinct
  TestValidator.notEquals(
    "legal hold codes for A1 and B1 must be different",
    holdA1.code,
    holdB1.code,
  );

  // 5-2. created_by_admin_id mapping
  TestValidator.equals(
    "hold A1 created_by_admin_id must match Admin A id",
    holdA1.created_by_admin_id,
    adminA.id,
  );
  TestValidator.equals(
    "hold B1 created_by_admin_id must match Admin B id",
    holdB1.created_by_admin_id,
    adminB.id,
  );

  // 5-3. created_by_admin summary must match corresponding admin identity
  TestValidator.equals(
    "hold A1 created_by_admin summary id must match Admin A id",
    holdA1.created_by_admin.id,
    adminA.id,
  );
  TestValidator.equals(
    "hold A1 created_by_admin summary email must match Admin A email",
    holdA1.created_by_admin.email,
    adminA.email,
  );
  TestValidator.equals(
    "hold B1 created_by_admin summary id must match Admin B id",
    holdB1.created_by_admin.id,
    adminB.id,
  );
  TestValidator.equals(
    "hold B1 created_by_admin summary email must match Admin B email",
    holdB1.created_by_admin.email,
    adminB.email,
  );
}
