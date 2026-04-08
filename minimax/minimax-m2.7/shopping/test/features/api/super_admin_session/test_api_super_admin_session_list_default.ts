import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_session_list_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Call sessions list endpoint with default parameters (empty body)
  const sessionsResponse =
    await api.functional.ecommerceMall.superAdmin.super_admin.sessions.index(
      superAdminConnection,
      {
        body: {} satisfies IEcommerceMallSuperAdminSession.IRequest,
      },
    );
  typia.assert(sessionsResponse);
  // 3. Validate pagination metadata exists and has correct structure
  TestValidator.equals(
    "pagination exists",
    sessionsResponse.pagination !== null,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(sessionsResponse.data),
    true,
  );
  // 4. Validate default pagination values (page starts at 1, limit defaults to 20)
  TestValidator.equals(
    "default page is 1",
    sessionsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit is 20",
    sessionsResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "records is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  // 5. Validate session records structure if any exist
  for (const session of sessionsResponse.data) {
    // Validate required session fields exist
    TestValidator.predicate(
      "session has valid id",
      session.id !== undefined && session.id.length > 0,
    );
    TestValidator.predicate("session has valid ip", session.ip !== undefined);
    TestValidator.predicate(
      "session has valid href",
      session.href !== undefined && session.href.length > 0,
    );
    TestValidator.predicate(
      "session has valid referrer",
      session.referrer !== undefined,
    );
    TestValidator.predicate(
      "session has valid createdAt",
      session.createdAt !== undefined && session.createdAt.length > 0,
    );
    TestValidator.predicate(
      "session has valid expiredAt",
      session.expiredAt !== undefined && session.expiredAt.length > 0,
    );
    TestValidator.predicate(
      "session has isActive boolean",
      typeof session.isActive === "boolean",
    );
    // Validate isActive is consistent with expiredAt
    const expiredAtDate = new Date(session.expiredAt);
    const now = new Date();
    const expectedIsActive = expiredAtDate > now;
    TestValidator.equals(
      "isActive matches expiredAt comparison",
      session.isActive,
      expectedIsActive,
    );
  }
  // 6. Verify sessions are sorted by createdAt in descending order (newest first)
  if (sessionsResponse.data.length > 1) {
    for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
      const currentSession = sessionsResponse.data[i];
      const nextSession = sessionsResponse.data[i + 1];
      const currentCreatedAt = new Date(currentSession.createdAt);
      const nextCreatedAt = new Date(nextSession.createdAt);
      TestValidator.predicate(
        "sessions sorted by createdAt descending",
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
  // 7. Validate pages calculation is correct
  if (sessionsResponse.pagination.records > 0) {
    const expectedPages = Math.ceil(
      sessionsResponse.pagination.records / sessionsResponse.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation is correct",
      sessionsResponse.pagination.pages,
      expectedPages,
    );
  }
}
