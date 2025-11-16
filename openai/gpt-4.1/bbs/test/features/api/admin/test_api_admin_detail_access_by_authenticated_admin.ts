import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";

/**
 * Validate that a newly registered administrator can access their account
 * details using their own token.
 *
 * - Register a new admin (unique email, strong password, URI for href/referrer)
 * - Ensure join returns an id and JWT token in the result
 * - Use the provided id to request account detail for that user
 * - Validate that the returned detail matches the registration, no credential
 *   fields are exposed, and all status/audit fields are set per backend
 *   contract
 * - Ensure sensitive fields (like password hash or token) are NOT present in
 *   detail
 * - All business status flags (is_active, is_blocked, is_email_verified, audit
 *   timestamps) should be correct by backend defaults
 */
export async function test_api_admin_detail_access_by_authenticated_admin(
  connection: api.IConnection,
) {
  // Register new admin
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.join/callback-" + RandomGenerator.alphaNumeric(5),
    referrer: "https://admin.join/ref-" + RandomGenerator.alphaNumeric(5),
  } satisfies IDiscussionBoardAdmin.IJoin;

  const joinResult: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: joinInput });
  typia.assert(joinResult);

  // Get admin detail with same token (must succeed)
  const detail: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.at(connection, {
      adminId: joinResult.id,
    });
  typia.assert(detail);

  // Validate audit and status fields
  TestValidator.equals("admin id matches", detail.id, joinResult.id);
  TestValidator.equals("admin email matches", detail.email, joinInput.email);
  TestValidator.equals(
    "email verified default false",
    detail.is_email_verified,
    false,
  );
  TestValidator.equals("active default true", detail.is_active, true);
  TestValidator.equals("blocked default false", detail.is_blocked, false);
  TestValidator.predicate(
    "created_at is ISO date",
    typeof detail.created_at === "string" &&
      detail.created_at.endsWith("Z") &&
      !isNaN(Date.parse(detail.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    typeof detail.updated_at === "string" &&
      detail.updated_at.endsWith("Z") &&
      !isNaN(Date.parse(detail.updated_at)),
  );
  TestValidator.equals("deleted_at should be null", detail.deleted_at, null);

  // Business rule: No credential/security fields in the detail response
  TestValidator.predicate(
    "password_hash not present",
    !("password_hash" in detail),
  );
  TestValidator.predicate("token not present in detail", !("token" in detail));
}
