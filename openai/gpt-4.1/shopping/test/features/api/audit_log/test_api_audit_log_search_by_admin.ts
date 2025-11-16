import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAuditLog";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuditLog";

/**
 * Validate admin audit log search (filtered & paginated) for privileged admin
 * user.
 *
 * Steps:
 *
 * 1. Register a new admin (unique email/password/name) using /auth/admin/join.
 * 2. Authenticate as the admin (token is handled by SDK automatically).
 * 3. Issue audit log search with multiple filters (change_type, risk_level,
 *    compliance_tag, actor_admin_id, time range, search text), paginate across
 *    results (pages 1 & 2), and check sorting (by created_at asc/desc).
 * 4. For each result, validate that every returned audit log record matches the
 *    provided filter(s).
 * 5. Perform a query with impossible filter (random change_type or risk_level) and
 *    assert result is empty.
 * 6. Query with maximum 'limit' (100), assert page data does not exceed 'limit',
 *    and check pagination metadata.
 * 7. Test combinations of filters (e.g., change_type + compliance_tag, risk_level
 *
 *    - Actor_admin_id, etc.).
 * 8. Attempt audit log search as unauthenticated (remove Authorization header),
 *    expect error.
 */
export async function test_api_audit_log_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<
    string & tags.MinLength<8> & tags.Format<"password">
  >();
  const adminName = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Run audit log queries by admin
  // (a) Unfiltered: get front page with no filters
  const page1 = await api.functional.shoppingMall.admin.auditLogs.index(
    connection,
    {
      body: {},
    },
  );
  typia.assert(page1);

  // (b) Use each filter separately (if page1 has results)
  if (page1.data.length > 0) {
    const sample = page1.data[0];
    // change_type filter
    const f1 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: { change_type: sample.change_type },
      },
    );
    typia.assert(f1);
    TestValidator.predicate(
      "change_type filter",
      f1.data.every((v) => v.change_type === sample.change_type),
    );
    // risk_level filter
    const f2 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: { risk_level: sample.risk_level },
      },
    );
    typia.assert(f2);
    TestValidator.predicate(
      "risk_level filter",
      f2.data.every((v) => v.risk_level === sample.risk_level),
    );
    // compliance_tag filter
    const f3 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: { compliance_tag: sample.compliance_tag },
      },
    );
    typia.assert(f3);
    TestValidator.predicate(
      "compliance_tag filter",
      f3.data.every((v) => v.compliance_tag === sample.compliance_tag),
    );
    // actor_admin_id filter (only if actor_admin_id present)
    if (sample.actor_admin_id !== null && sample.actor_admin_id !== undefined) {
      const f4 = await api.functional.shoppingMall.admin.auditLogs.index(
        connection,
        {
          body: { actor_admin_id: sample.actor_admin_id },
        },
      );
      typia.assert(f4);
      TestValidator.predicate(
        "actor_admin_id filter",
        f4.data.every((v) => v.actor_admin_id === sample.actor_admin_id),
      );
    }
    // time-range filter (start_time, end_time)
    const f5 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: { start_time: sample.created_at, end_time: sample.created_at },
      },
    );
    typia.assert(f5);
    TestValidator.predicate(
      "time range filter",
      f5.data.every((v) => v.created_at === sample.created_at),
    );
    // search filter (using substring of audit_detail)
    const searchTerm = RandomGenerator.substring(sample.audit_detail);
    const f6 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: { search: searchTerm },
      },
    );
    typia.assert(f6);
    TestValidator.predicate(
      "search filter",
      f6.data.every((v) => v.audit_detail.includes(searchTerm)),
    );
    // pagination & sorting on page1
    const f7 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: {
          limit: 1,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "created_at",
          sort_direction: "asc",
        },
      },
    );
    typia.assert(f7);
    TestValidator.equals("1st page at limit=1", f7.pagination.current, 1);
    TestValidator.predicate("limit respected", f7.data.length <= 1);
    // page 2
    const f8 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: {
          limit: 1,
          page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
          sort_by: "created_at",
          sort_direction: "asc",
        },
      },
    );
    typia.assert(f8);
    TestValidator.equals("2nd page at limit=1", f8.pagination.current, 2);
  }
  // (c) Impossible filter = empty result
  const impossible = await api.functional.shoppingMall.admin.auditLogs.index(
    connection,
    {
      body: { change_type: RandomGenerator.alphaNumeric(16) },
    },
  );
  typia.assert(impossible);
  TestValidator.equals(
    "impossible filter result empty",
    impossible.data.length,
    0,
  );

  // (d) Max limit enforcement
  const bigPage = await api.functional.shoppingMall.admin.auditLogs.index(
    connection,
    {
      body: {
        limit: 100 as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      },
    },
  );
  typia.assert(bigPage);
  TestValidator.predicate(
    "max page does not exceed limit",
    bigPage.data.length <= 100,
  );

  // (e) Multiple filters (if we have results in bigPage)
  if (bigPage.data.length > 0) {
    const log = RandomGenerator.pick(bigPage.data);
    // change_type + compliance_tag
    const multi1 = await api.functional.shoppingMall.admin.auditLogs.index(
      connection,
      {
        body: {
          change_type: log.change_type,
          compliance_tag: log.compliance_tag,
        },
      },
    );
    typia.assert(multi1);
    TestValidator.predicate(
      "change_type+compliance_tag",
      multi1.data.every(
        (v) =>
          v.change_type === log.change_type &&
          v.compliance_tag === log.compliance_tag,
      ),
    );
    // risk_level + actor_admin_id
    if (log.actor_admin_id !== null && log.actor_admin_id !== undefined) {
      const multi2 = await api.functional.shoppingMall.admin.auditLogs.index(
        connection,
        {
          body: {
            risk_level: log.risk_level,
            actor_admin_id: log.actor_admin_id,
          },
        },
      );
      typia.assert(multi2);
      TestValidator.predicate(
        "risk_level+actor_admin_id",
        multi2.data.every(
          (v) =>
            v.risk_level === log.risk_level &&
            v.actor_admin_id === log.actor_admin_id,
        ),
      );
    }
  }

  // (f) Unauthorized: remove Authorization
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin audit log search should fail",
    async () => {
      await api.functional.shoppingMall.admin.auditLogs.index(unauthConn, {
        body: {},
      });
    },
  );
}
