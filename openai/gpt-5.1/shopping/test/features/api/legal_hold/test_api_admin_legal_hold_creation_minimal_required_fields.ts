import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate that an authenticated admin can create a legal hold with only
 * required fields populated while optional fields remain empty/null.
 *
 * Business flow:
 *
 * 1. Register a fresh admin via POST /auth/admin/join and obtain an authenticated
 *    connection (SDK auto-sets Authorization header).
 * 2. Call POST /shoppingMall/admin/legalHolds with an
 *    IShoppingMallLegalHold.ICreate request body that sets:
 *
 *    - Code: unique business identifier
 *    - Title: meaningful title string
 *    - Status: "active" (or other valid active-like value as plain string)
 *    - Description, scope_description, external_reference, effective_from:
 *         intentionally left empty (null) to represent minimal required
 *         fields.
 * 3. Assert that the response conforms to IShoppingMallLegalHold and that business
 *    expectations are satisfied:
 *
 *    - Id is a UUID (enforced by typia.assert)
 *    - Code, title, status echo the request
 *    - Created_at and updated_at are populated (date-time strings)
 *    - Created_by_admin_id matches the joined admin id
 *    - Created_by_admin summary exists and its id equals created_by_admin_id
 *    - Released_at and deleted_at are not set (null/undefined)
 */
export async function test_api_admin_legal_hold_creation_minimal_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin via /auth/admin/join
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "P@ssw0rd!", // any string is allowed; Format<"password"> is logical not structural
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare minimal legal hold creation payload
  const legalHoldCodeBase = RandomGenerator.alphaNumeric(12);
  const legalHoldCode = `AUTO-LH-${legalHoldCodeBase}`;

  const createBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    description: null,
    scope_description: null,
    external_reference: null,
    effective_from: null,
  } satisfies IShoppingMallLegalHold.ICreate;

  const createdHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallLegalHold>(createdHold);

  // 3. Business logic validations
  TestValidator.equals(
    "legal hold code should match request",
    createdHold.code,
    createBody.code,
  );

  TestValidator.equals(
    "legal hold title should match request",
    createdHold.title,
    createBody.title,
  );

  TestValidator.equals(
    "legal hold status should match request",
    createdHold.status,
    createBody.status,
  );

  // created_by_admin_id must match the authorized admin id
  TestValidator.equals(
    "created_by_admin_id should equal admin id",
    createdHold.created_by_admin_id,
    authorizedAdmin.id,
  );

  // created_by_admin summary should be populated and consistent
  TestValidator.predicate(
    "created_by_admin summary must be present",
    createdHold.created_by_admin !== undefined &&
      createdHold.created_by_admin !== null,
  );

  if (
    createdHold.created_by_admin !== undefined &&
    createdHold.created_by_admin !== null
  ) {
    TestValidator.equals(
      "created_by_admin.id should match created_by_admin_id",
      createdHold.created_by_admin.id,
      createdHold.created_by_admin_id,
    );
  }

  // released_at and deleted_at should not be set on a fresh active hold
  TestValidator.predicate(
    "released_at should be null or undefined on creation",
    createdHold.released_at === null || createdHold.released_at === undefined,
  );

  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    createdHold.deleted_at === null || createdHold.deleted_at === undefined,
  );
}
