import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAuditLog";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsAuditLog";

export async function test_api_audit_logs_search_by_system_admin(
  connection: api.IConnection,
) {
  // 1) Create a new system admin account. The SDK attaches issued access token
  //    to the provided connection automatically.
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Passw0rdA"; // satisfies min-length and pattern

  const adminAuth: ICommunityBbsSystemAdmin.IAuthorized =
    await api.functional.auth.systemAdmin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(),
      } satisfies ICommunityBbsSystemAdmin.ICreate,
    });
  typia.assert(adminAuth);
  const adminId = adminAuth.admin.id;

  // 2) As admin, search audit logs for entries attributed to the created admin.
  const requestBody = {
    actor_type: "system_admin",
    actor_id: adminId,
    limit: 10,
    sort_by: "created_at",
    order: "desc",
  } satisfies ICommunityBbsAuditLog.IRequest;

  // Retry loop for eventual consistency: attempt a few times for the audit
  // entry to appear.
  let page: IPageICommunityBbsAuditLog.ISummary | null = null;
  for (let attempt = 0; attempt < 5; ++attempt) {
    page = await api.functional.communityBbs.systemAdmin.audit.logs.index(
      connection,
      { body: requestBody },
    );

    // If at least one matching record found, stop retrying
    if (
      page.data.find(
        (s) => s.actor_type === "system_admin" && s.actor_id === adminId,
      )
    )
      break;

    // Backoff before next attempt
    await new Promise((res) => setTimeout(res, 300));
  }

  // Final validations on the retrieved page
  typia.assert(page!);
  TestValidator.predicate(
    "pagination present",
    page!.pagination !== undefined && Array.isArray(page!.data),
  );

  TestValidator.predicate(
    "pagination limit reasonable",
    typeof page!.pagination.limit === "number" &&
      page!.pagination.limit > 0 &&
      page!.pagination.limit <= 100,
  );

  const match = page!.data.find(
    (s) => s.actor_type === "system_admin" && s.actor_id === adminId,
  );
  TestValidator.predicate(
    "audit includes admin join event",
    match !== undefined,
  );

  // Payload redaction checks: ensure payload excerpts do not leak obvious secrets
  for (const ent of page!.data) {
    if (ent.payload !== null && ent.payload !== undefined) {
      TestValidator.predicate(
        `payload excerpt redacted for ${ent.id}`,
        !ent.payload.toLowerCase().includes("password") &&
          !ent.payload.toLowerCase().includes("password_hash") &&
          !ent.payload.includes(adminPassword),
      );
    }
  }

  // 4) Authorization enforcement: unauthenticated connection must not access audit logs
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "non-admin/unauthenticated cannot access audit logs",
    async () => {
      await api.functional.communityBbs.systemAdmin.audit.logs.index(
        unauthConn,
        {
          body: { limit: 1 } satisfies ICommunityBbsAuditLog.IRequest,
        },
      );
    },
  );

  // 5) Validation check: malformed date filter should be rejected by server-side validation
  await TestValidator.error("malformed date filter should fail", async () => {
    await api.functional.communityBbs.systemAdmin.audit.logs.index(connection, {
      body: {
        created_at_from: "not-a-date",
        limit: 5,
      } satisfies ICommunityBbsAuditLog.IRequest,
    });
  });
}
