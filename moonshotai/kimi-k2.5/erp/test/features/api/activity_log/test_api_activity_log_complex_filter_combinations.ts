import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_activity_log_complex_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create organization as scope for activity log queries
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Test 1: Filter by multiple action types and entity types
  const multiFilterResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: ["create", "update"],
          entityType: ["member", "role", "department"],
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: null,
          limit: null,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(multiFilterResult);
  // Test 2: IP address partial matching for security monitoring
  const ipFilterResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: "192.168",
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: null,
          limit: null,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(ipFilterResult);
  // Test 3: Sorting by action ASC instead of default created_at DESC
  const sortResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: "action ASC",
          page: null,
          limit: null,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(sortResult);
  // Test 4: Pagination - page 2 with limited page size
  const paginationResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: null,
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: 2,
          limit: 5,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination current page is 2",
    paginationResult.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationResult.pagination.limit,
    5,
  );
  // Test 5: Partial text search on action, entity_type, and entity_id fields
  const searchResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: "create",
          action: null,
          entityType: null,
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: null,
          page: null,
          limit: null,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(searchResult);
  // Test 6: Combined filters with AND logic between different filter fields
  const combinedResult =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          search: "member",
          action: ["create"],
          entityType: ["member"],
          entityId: null,
          actorMemberId: null,
          actorGuestId: null,
          ipAddress: null,
          createdAtFrom: null,
          createdAtTo: null,
          sort: "created_at DESC",
          page: 1,
          limit: 10,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(combinedResult);
}
