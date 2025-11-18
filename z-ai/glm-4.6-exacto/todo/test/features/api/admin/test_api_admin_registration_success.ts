import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validates successful registration of a new administrator using valid, unique
 * email and password, along with session context fields (href, referrer,
 * optional ip).
 *
 * This test ensures:
 *
 * 1. A new administrator can register using a unique email and a plaintext
 *    password in compliance with business/password policy.
 * 2. Session context (href and referrer URIs, plus optional ip) is supplied for
 *    audit and compliance tracking.
 * 3. Upon success, the admin record is created, password is returned as a hash
 *    (not plaintext), tokens and session details are returned.
 * 4. All returned data adheres to security, business, and audit expectations.
 */
export async function test_api_admin_registration_success(
  connection: api.IConnection,
) {
  // Generate a unique email for the new admin
  const email = typia.random<string & tags.Format<"email">>();
  // Generate a strong, random password
  const password = RandomGenerator.alphaNumeric(12);
  // Supply valid absolute URLs for session context
  const href = "https://admin.todoapp.io/registration";
  const referrer = "https://todoapp.io/home";
  // Optionally include an IP address (cover optional/undefined/null)
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // Prepare join request body (all required session/audit context fields)
  const joinBody = {
    email,
    password,
    ip, // test presence of optional IP (could omit to test defaulting)
    href,
    referrer,
  } satisfies ITodoAppAdmin.IJoin;

  // Register the administrator
  const result = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert(result);

  // Validate all required fields and security policies in response
  TestValidator.equals("registered email matches request", result.email, email);
  // Password returned should be password_hash (NOT the plaintext password!)
  TestValidator.predicate(
    "password is returned as a hash, not plaintext",
    typeof result.password_hash === "string" &&
      !result.password_hash.includes(password) &&
      result.password_hash.length >= 32,
  );
  // Confirm UUID, timestamp, tokens, etc.
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      result.id,
    ),
  );
  TestValidator.predicate(
    "admin created_at is date-time",
    /T.*Z$/.test(result.created_at),
  );
  TestValidator.predicate(
    "admin updated_at is date-time",
    /T.*Z$/.test(result.updated_at),
  );
  TestValidator.predicate(
    "token is present",
    !!result.token && !!result.token.access && !!result.token.refresh,
  );
  TestValidator.predicate(
    "token.expired_at and refreshable_until are date-time",
    /T.*Z$/.test(result.token.expired_at) &&
      /T.*Z$/.test(result.token.refreshable_until),
  );
  // Session must exist and have correct context data
  TestValidator.predicate("admin session summary present", !!result.session);
  if (result.session) {
    TestValidator.equals(
      "session admin_id matches returned id",
      result.session.admin_id,
      result.id,
    );
    TestValidator.equals("session ip matches input", result.session.ip, ip);
    TestValidator.equals(
      "session href matches input",
      result.session.href,
      href,
    );
    TestValidator.equals(
      "session referrer matches input",
      result.session.referrer,
      referrer,
    );
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        result.session.id,
      ),
    );
    TestValidator.predicate(
      "session created_at is date-time",
      /T.*Z$/.test(result.session.created_at),
    );
  }
  TestValidator.equals(
    "deleted_at is null for active admin",
    result.deleted_at,
    null,
  );
}
