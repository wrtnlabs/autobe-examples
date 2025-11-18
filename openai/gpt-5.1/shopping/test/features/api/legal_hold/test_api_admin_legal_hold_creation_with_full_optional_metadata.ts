import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";

/**
 * Validate creation of a legal hold with full optional metadata by an
 * authenticated admin.
 *
 * Business purpose
 *
 * - Governance or compliance admins establish legal holds that prevent deletion
 *   or modification of specific data for investigation or regulatory reasons.
 * - When creating a hold, admins can enrich it with descriptive metadata and an
 *   effective-from timestamp to document the case and scope.
 *
 * What this test verifies
 *
 * 1. An admin can successfully join via POST /auth/admin/join and receive an
 *    authenticated context (IAuthorized) with tokens handled by the SDK.
 * 2. Using that authenticated connection, the admin can call POST
 *    /shoppingMall/admin/legalHolds with a rich IShoppingMallLegalHold.ICreate
 *    payload that includes:
 *
 *    - Code (unique business identifier)
 *    - Title (human-readable case title)
 *    - Status (e.g. "active")
 *    - Description (multi-sentence explanation)
 *    - Scope_description (text describing affected entities/time ranges)
 *    - External_reference (external case or ticket id)
 *    - Effective_from (concrete ISO date-time string)
 * 3. The response IShoppingMallLegalHold:
 *
 *    - Echoes back the basic identifiers and metadata fields as provided
 *    - Keeps released_at null/undefined at creation time (hold not released yet)
 *    - Links the creating admin via created_by_admin_id and created_by_admin
 *         summary.
 *
 * Notes
 *
 * - The original scenario mentions a GET
 *   /shoppingMall/admin/legalHolds/{legalHoldCode} endpoint for re-loading by
 *   code, but such function is not present in the provided SDK. Therefore, this
 *   test validates persistence using only the create response object.
 */
export async function test_api_admin_legal_hold_creation_with_full_optional_metadata(
  connection: api.IConnection,
) {
  // 1. Admin joins and becomes authenticated
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // Verify that authorization payload has expected identity shape
  TestValidator.predicate(
    "admin authorized payload has email and token access",
    authorizedAdmin.email.length > 0 && authorizedAdmin.token.access.length > 0,
  );

  // 2. Prepare rich legal hold creation payload
  const code = `LEGAL-${RandomGenerator.alphaNumeric(10)}`;
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const description = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const scopeDescription = RandomGenerator.paragraph({ sentences: 5 });
  const externalReference = `CASE-${RandomGenerator.alphaNumeric(8)}`;

  // Use a concrete date-time near "now" with ISO format
  const effectiveFromDate: string & tags.Format<"date-time"> =
    RandomGenerator.date(new Date(), 0).toISOString() as string &
      tags.Format<"date-time">;

  const createBody = {
    code,
    title,
    description,
    status: "active",
    scope_description: scopeDescription,
    external_reference: externalReference,
    effective_from: effectiveFromDate,
  } satisfies IShoppingMallLegalHold.ICreate;

  // 3. Call legal hold creation endpoint
  const created: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 4. Validate core fields echo correctly
  TestValidator.equals("legal hold code echoes input", created.code, code);
  TestValidator.equals("legal hold title echoes input", created.title, title);
  TestValidator.equals(
    "legal hold status echoes input",
    created.status,
    createBody.status,
  );
  TestValidator.equals(
    "legal hold description echoes input",
    created.description,
    description,
  );
  TestValidator.equals(
    "legal hold scope_description echoes input",
    created.scope_description,
    scopeDescription,
  );
  TestValidator.equals(
    "legal hold external_reference echoes input",
    created.external_reference,
    externalReference,
  );
  TestValidator.equals(
    "legal hold effective_from echoes input",
    created.effective_from,
    effectiveFromDate,
  );

  // 5. Lifecycle and admin linkage checks
  TestValidator.equals(
    "legal hold released_at is null on creation",
    created.released_at ?? null,
    null,
  );

  TestValidator.equals(
    "created_by_admin_id matches authorized admin id",
    created.created_by_admin_id,
    authorizedAdmin.id,
  );
  TestValidator.equals(
    "created_by_admin summary id matches authorized admin id",
    created.created_by_admin.id,
    authorizedAdmin.id,
  );
}
