import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdminSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_session_listing_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using /erpHrm/auth/admin/join to create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmAdmin.IJoin,
  });
  // 2. Send PATCH request to /erpHrm/admin/admin-sessions with empty request body
  const output = await api.functional.erpHrm.admin.admin_sessions.index(
    adminConnection,
    {
      body: {} satisfies IErpHrmAdminSession.IRequest,
    },
  );
  typia.assert(output);
  // 3. Verify response returns paginated data structure
  TestValidator.equals("has pagination", output.pagination !== null, true);
  TestValidator.equals("has data array", Array.isArray(output.data), true);
  // 4. Validate pagination object structure
  TestValidator.predicate(
    "pagination has current",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    output.pagination.records >= 0,
  );
  TestValidator.predicate("pagination has pages", output.pagination.pages >= 0);
  // 5. Validate default pagination behavior (page=1, limit=20)
  TestValidator.equals("default page is 1", output.pagination.current, 1);
  TestValidator.equals("default limit is 20", output.pagination.limit, 20);
  // 6. Validate each session summary structure
  for (const session of output.data) {
    TestValidator.predicate(
      "session has valid uuid",
      /^[0-9a-f-]{36}$/i.test(session.id),
    );
    TestValidator.predicate("session has ip", typeof session.ip === "string");
    TestValidator.predicate(
      "session has href",
      typeof session.href === "string",
    );
    TestValidator.predicate(
      "session has referrer",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session has created_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.created_at),
    );
    TestValidator.predicate(
      "session has expired_at",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(session.expired_at),
    );
    TestValidator.predicate(
      "session has admin object",
      session.admin !== null && typeof session.admin === "object",
    );
    TestValidator.predicate("admin has id", session.admin.id !== undefined);
    TestValidator.predicate(
      "admin has email",
      typeof session.admin.email === "string",
    );
    TestValidator.predicate(
      "admin has display_name",
      typeof session.admin.display_name === "string",
    );
  }
  // 7. Verify results are sorted by created_at descending (newest first)
  if (output.data.length > 1) {
    for (let i = 0; i < output.data.length - 1; i++) {
      const current = new Date(output.data[i].created_at).getTime();
      const next = new Date(output.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `session[${i}] created_at >= session[${i + 1}] created_at`,
        current >= next,
      );
    }
  }
}
