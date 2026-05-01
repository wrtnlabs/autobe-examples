import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator audit of another administrator's session history.
 *
 * Validates the complete session audit workflow where a super administrator
 * reviews another administrator's login session records. The test establishes
 * a two-tier administrator hierarchy by creating a regular administrator,
 * promoting them to super administrator grade, then creating a second
 * administrator whose sessions become the audit target.
 *
 * Special attention is given to verifying session record content: each session
 * must include the originating IP address, the page URL accessed at session
 * creation, the referrer URL, and both creation and expiration timestamps.
 * Sessions must be returned sorted by creation time descending, and pagination
 * metadata must accurately reflect the result set.
 *
 * 1. First administrator registers with explicit credentials and is promoted
 *    to super administrator grade.
 * 2. Second administrator registers (join creates an initial session record).
 * 3. Second administrator logs in (creates an additional session record).
 * 4. Super administrator lists the second administrator's sessions via the
 *    sessions index endpoint with no filters.
 * 5. Validates at least 2 sessions exist with complete audit fields.
 * 6. Validates session ordering: newest session first (created_at descending).
 * 7. Validates pagination metadata: current page is 1, records count is at
 *    least the number of returned data items, pages >= 1, limit > 0.
 * 8. Validates each session's admin reference matches the second administrator.
 */
export async function test_api_admin_session_super_admin_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first administrator (regular grade) and promote to super
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: firstAdminEmail,
      password: firstAdminPassword,
    },
  });
  typia.assert(firstAdmin);
  const promoted = await api.functional.shoppingMall.admin.admins.promote(
    superAdminConnection,
    { adminId: firstAdmin.id },
  );
  typia.assert(promoted);
  // 2. Create second administrator (join creates initial session)
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  const secondAdminPassword = RandomGenerator.alphaNumeric(16);
  const secondJoinConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondJoinConnection, {
    body: {
      email: secondAdminEmail,
      password: secondAdminPassword,
    },
  });
  typia.assert(secondAdmin);
  // 3. Login as second administrator (creates additional session)
  const secondLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(secondLoginConnection, {
    body: {
      email: secondAdminEmail,
      password: secondAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Super administrator audits second administrator's sessions
  const sessions =
    await api.functional.shoppingMall.admin.admins.sessions.index(
      superAdminConnection,
      {
        adminId: secondAdmin.id,
        body: {},
      },
    );
  typia.assert(sessions);
  // 5. Validate session data exists
  TestValidator.predicate(
    "at least 2 sessions exist",
    sessions.data.length >= 2,
  );
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    sessions.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= data length",
    sessions.pagination.records >= sessions.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    sessions.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    sessions.pagination.limit > 0,
  );
  // 7. Validate each session's audit fields and admin reference
  for (const session of sessions.data) {
    TestValidator.predicate("session has IP address", session.ip.length > 0);
    TestValidator.predicate("session has valid href", session.href.length > 0);
    TestValidator.predicate(
      "session has created_at timestamp",
      session.created_at.length > 0,
    );
    TestValidator.predicate(
      "session has expired_at timestamp",
      session.expired_at.length > 0,
    );
    TestValidator.equals(
      "session admin id matches audited admin",
      session.admin.id,
      secondAdmin.id,
    );
  }
  // 8. Validate sessions sorted by created_at descending (newest first)
  for (let i = 1; i < sessions.data.length; i++) {
    const prevTime = new Date(sessions.data[i - 1].created_at).getTime();
    const currTime = new Date(sessions.data[i].created_at).getTime();
    TestValidator.predicate(
      `sessions sorted newest first (index ${i})`,
      prevTime >= currTime,
    );
  }
}
