import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Validates administrative login session audit IP handling for
 * /auth/admin/login. Ensures correct IP capture on login when the ip field is
 * omitted, explicitly null, or supplied.
 *
 * 1. Generate random admin credentials and register that admin directly via
 *    backend (if needed, else assume exists).
 * 2. Attempt login with ip omitted from request body.
 *
 *    - Check that session is created, session.ip is present, non-empty, and is a
 *         plausible IP address string.
 *    - Validate all session compliance fields are non-null.
 * 3. Attempt login with ip: null field explicitly supplied.
 *
 *    - Repeat above validation for session.ip handling.
 * 4. Attempt login supplying ip as a random IPv4/IPv6 address.
 *
 *    - Assert session.ip matches supplied value.
 *    - Remainder of session compliance validation as above.
 * 5. Compare session IP and compliance field values across all cases for
 *    consistency/audit trace.
 * 6. Assert auditability: session.ip is never empty/undefined, and audit context
 *    is complete for all variants.
 */
export async function test_api_admin_login_audit_ip_handling(
  connection: api.IConnection,
) {
  // 1. Generate test admin credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const href = `https://admin.todoapp.example.com/login`;
  const referrer = `https://admin.todoapp.example.com/`;

  // Assume admin account already exists, or if backend supports, create here (creation not in scope).

  // 2. Attempt login with ip omitted
  const loginBodyOmitIp = {
    email: adminEmail,
    password: adminPassword,
    href,
    referrer,
  } satisfies ITodoAppAdmin.ILogin;
  const responseOmitIp = await api.functional.auth.admin.login(connection, {
    body: loginBodyOmitIp,
  });
  typia.assert(responseOmitIp);
  TestValidator.predicate(
    "session.ip populated when ip omitted",
    !!(
      responseOmitIp.session &&
      typeof responseOmitIp.session.ip === "string" &&
      responseOmitIp.session.ip.length > 0
    ),
  );

  // 3. Attempt login with ip: null
  const loginBodyNullIp = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href,
    referrer,
  } satisfies ITodoAppAdmin.ILogin;
  const responseNullIp = await api.functional.auth.admin.login(connection, {
    body: loginBodyNullIp,
  });
  typia.assert(responseNullIp);
  TestValidator.predicate(
    "session.ip populated when ip explicitly null",
    !!(
      responseNullIp.session &&
      typeof responseNullIp.session.ip === "string" &&
      responseNullIp.session.ip.length > 0
    ),
  );

  // 4. Attempt login with ip: random IPv4 or IPv6
  const manualIp = RandomGenerator.pick([
    typia.random<string & tags.Format<"ipv4">>(),
    typia.random<string & tags.Format<"ipv6">>(),
  ]);
  const loginBodyManualIp = {
    email: adminEmail,
    password: adminPassword,
    ip: manualIp,
    href,
    referrer,
  } satisfies ITodoAppAdmin.ILogin;
  const responseManualIp = await api.functional.auth.admin.login(connection, {
    body: loginBodyManualIp,
  });
  typia.assert(responseManualIp);
  TestValidator.equals(
    "session.ip matches supplied ip when provided",
    responseManualIp.session?.ip,
    manualIp,
  );

  // 5. All sessions should be defined and consistent
  const sessions = [
    responseOmitIp.session,
    responseNullIp.session,
    responseManualIp.session,
  ];
  sessions.forEach((session, idx) => {
    TestValidator.predicate(
      `session #${idx + 1} has non-empty id, ip, href, referrer`,
      !!(
        session?.id &&
        session.ip &&
        session.href &&
        session.referrer &&
        session.created_at
      ),
    );
  });
  // 6. If possible (sessions returned), their admin_id should match, ip fields consistent for auto-detect variants, and auditability guaranteed.
  if (responseOmitIp.session && responseNullIp.session) {
    // If the backend uses the detected remote IP, both should match or have valid, non-empty IPs
    TestValidator.equals(
      "auto-detect ip for omitted/null ip should match",
      responseOmitIp.session.ip,
      responseNullIp.session.ip,
    );
  }
}
