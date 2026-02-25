import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_audit_logs_pagination_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test pagination with existing audit logs
  // We'll test various pagination scenarios with whatever data exists
  // Test 1: Basic pagination with default parameters
  const page1 = await api.functional.communityPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    },
  );
  typia.assert(page1);
  // Test 2: Different page sizes
  const pageSize25 =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 25,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(pageSize25);
  const pageSize50 =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(pageSize50);
  // Test 3: Edge case - page 0 (should default to page 1)
  const page0 = await api.functional.communityPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 0,
        limit: 10,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    },
  );
  typia.assert(page0);
  TestValidator.equals(
    "page 0 should default to page 1",
    page0.pagination.current,
    1,
  );
  // Test 4: Request page beyond total pages
  const largePage =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.predicate(
    "page beyond total should have empty data",
    largePage.data.length === 0,
  );
  // Test 5: Empty filter results
  const emptyFilter =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "nonexistent_actor",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(emptyFilter);
  TestValidator.predicate(
    "empty filter should have empty data",
    emptyFilter.data.length === 0,
  );
  // Test 6: Verify pagination metadata consistency
  TestValidator.predicate(
    "page limit should be positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    page1.pagination.pages >= 0,
  );
  // Test 7: Verify data ordering (should be by created_at descending)
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      const current = new Date(page1.data[i].created_at);
      const previous = new Date(page1.data[i - 1].created_at);
      TestValidator.predicate(
        "records should be ordered by created_at descending",
        current <= previous,
      );
    }
  }
  // Test 8: Verify pagination calculations
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page1.pagination.records / page1.pagination.limit,
    );
    TestValidator.equals(
      "total pages calculation should be correct",
      page1.pagination.pages,
      expectedPages,
    );
  }
  // Test 9: Different limit values
  const limit5 = await api.functional.communityPlatform.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies ICommunityPlatformAuditLog.IRequest,
    },
  );
  typia.assert(limit5);
  TestValidator.predicate(
    "limit 5 should return at most 5 records",
    limit5.data.length <= 5,
  );
  const limit100 =
    await api.functional.communityPlatform.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformAuditLog.IRequest,
      },
    );
  typia.assert(limit100);
  TestValidator.predicate(
    "limit 100 should return at most 100 records",
    limit100.data.length <= 100,
  );
  // Test 10: Verify pagination metadata across different requests
  TestValidator.equals(
    "total records should be consistent across pagination",
    page1.pagination.records,
    pageSize25.pagination.records,
  );
  TestValidator.equals(
    "total records should be consistent across pagination",
    page1.pagination.records,
    pageSize50.pagination.records,
  );
}
