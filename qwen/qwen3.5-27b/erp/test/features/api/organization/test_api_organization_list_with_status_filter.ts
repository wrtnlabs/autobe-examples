import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_organization_list_with_status_filter(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test filtering organizations by status (active vs deleted).
   * 1. Retrieve all organizations without status filter to establish baseline
   * 2. Call with status='active' filter and verify deleted_at IS NULL
   * 3. Call with status='deleted' filter and verify deleted_at IS NOT NULL
   * 4. Compare counts to ensure filtering works correctly
   */
  // 1. Get baseline - all organizations without status filter
  const allOrgs = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(allOrgs);
  // 2. Get active organizations only (status='active')
  const activeOrgs = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        status: "active",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(activeOrgs);
  // 3. Verify all active organizations have deleted_at = null
  for (const org of activeOrgs.data) {
    TestValidator.equals(
      `organization ${org.id} should have deleted_at = null`,
      org.deleted_at,
      null,
    );
  }
  // 4. Get deleted organizations only (status='deleted')
  const deletedOrgs = await api.functional.hrmPlatform.organizations.index(
    connection,
    {
      body: {
        status: "deleted",
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(deletedOrgs);
  // 5. Verify all deleted organizations have deleted_at != null
  for (const org of deletedOrgs.data) {
    TestValidator.predicate(
      `organization ${org.id} should have deleted_at not null`,
      org.deleted_at !== null,
    );
  }
  // 6. Verify pagination records match data length for active
  TestValidator.equals(
    "active organizations pagination records count",
    activeOrgs.data.length,
    activeOrgs.pagination.records,
  );
  // 7. Verify pagination records match data length for deleted
  TestValidator.equals(
    "deleted organizations pagination records count",
    deletedOrgs.data.length,
    deletedOrgs.pagination.records,
  );
  // 8. Verify total count equals sum of active and deleted
  TestValidator.equals(
    "total organizations equals active + deleted",
    allOrgs.pagination.records,
    activeOrgs.pagination.records + deletedOrgs.pagination.records,
  );
  // 9. Verify no overlap between active and deleted sets
  const activeIds = new Set(activeOrgs.data.map((o) => o.id));
  const deletedIds = new Set(deletedOrgs.data.map((o) => o.id));
  let hasOverlap = false;
  for (const id of activeIds) {
    if (deletedIds.has(id)) {
      hasOverlap = true;
      break;
    }
  }
  TestValidator.equals(
    "no organization should appear in both active and deleted lists",
    hasOverlap,
    false,
  );
}
