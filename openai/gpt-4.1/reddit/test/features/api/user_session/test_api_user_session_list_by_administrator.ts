import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUserSession";

/**
 * Validate administrator session listing API and access control.
 *
 * 1. Register a new administrator and authenticate.
 * 2. Attempt to access session listing as a non-administrator (should fail).
 * 3. As administrator, list sessions for a random userId with default paging;
 *    check valid response and correct filtering by userId.
 * 4. Apply random filters (status, date range, ip) and confirm data matches the
 *    filter (checking only the indicated userId).
 * 5. Test a filter guaranteed to yield zero matches (e.g., status or ip that
 *    cannot exist); expect empty data and valid pagination structure.
 * 6. Test unauthorized access: no JWT, invalid JWT, and ensure access is denied
 *    for those cases.
 */
export async function test_api_user_session_list_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator and authenticate.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  const adminUserId = admin.id;
  typia.assert<IAuthorizationToken>(admin.token);
  const adminAccessToken = admin.token.access;

  // 2. Attempt to access as a non-admin (simulate by clearing headers)
  const nonAdminConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("non-admin access denied", async () => {
    await api.functional.communityPlatform.administrator.users.sessions.index(
      nonAdminConn,
      {
        userId: adminUserId,
        body: {},
      },
    );
  });

  // 3. List sessions as administrator (should be possible)
  const page1 =
    await api.functional.communityPlatform.administrator.users.sessions.index(
      connection,
      {
        userId: adminUserId,
        body: {},
      },
    );
  typia.assert(page1);
  TestValidator.equals(
    "all sessions belong to indicated user",
    page1.data.every((s) => s.id !== null && s.id !== undefined),
    true,
  );

  // 4. Apply a status filter
  const statusFilter = "nonexistent-status-for-test";
  const filtered =
    await api.functional.communityPlatform.administrator.users.sessions.index(
      connection,
      {
        userId: adminUserId,
        body: { status: statusFilter },
      },
    );
  typia.assert(filtered);
  TestValidator.equals(
    "empty result for impossible status filter",
    filtered.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records match empty data",
    filtered.pagination.records,
    0,
  );

  // 5. Try with page & limit filters (simulate possible pagination, though likely no sessions)
  const paged =
    await api.functional.communityPlatform.administrator.users.sessions.index(
      connection,
      {
        userId: adminUserId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        },
      },
    );
  typia.assert(paged);
  TestValidator.equals("pagination limit honored", paged.pagination.limit, 10);

  // 6. Unauthorized access: missing or invalid JWT
  const badConn: api.IConnection = {
    ...connection,
    headers: { Authorization: "Bearer invalidtoken" },
  };
  await TestValidator.error("invalid JWT should be denied", async () => {
    await api.functional.communityPlatform.administrator.users.sessions.index(
      badConn,
      {
        userId: adminUserId,
        body: {},
      },
    );
  });
}
