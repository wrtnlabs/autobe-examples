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

/**
 * Test the edge case of querying activity logs with empty result sets and boundary conditions.
 * This scenario validates that the pagination system handles edge cases gracefully when filtering
 * criteria match no records. The test should filter logs with a date range far in the future
 * where no activity has occurred, and verify that the response returns an empty data array with
 * proper pagination metadata. Additionally test filtering by both actorMemberId and actorGuestId
 * simultaneously to validate AND logic resulting in empty results when actors are different.
 */
export async function test_api_activity_log_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IErpHrmMember.IAuthorized = await authorize_member_join(
    memberConnection,
    { body: {} },
  );
  typia.assert(member);
  // 2. Create an organization
  const organization: IErpHrmOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {},
      },
    );
  typia.assert(organization);
  // 3. Test: Query activity logs with date range far in the future (no activity should exist)
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 100); // 100 years in the future
  const futureDateEnd = new Date(futureDate.getTime() + 86400000); // +1 day
  const emptyByDateRequest = {
    search: null,
    action: null,
    entityType: null,
    entityId: null,
    actorMemberId: null,
    actorGuestId: null,
    ipAddress: null,
    createdAtFrom: futureDate.toISOString(),
    createdAtTo: futureDateEnd.toISOString(),
    sort: null,
    page: 1,
    limit: 20,
  } satisfies IErpHrmActivityLog.IRequest;
  const emptyByDateResult: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: emptyByDateRequest,
      },
    );
  typia.assert(emptyByDateResult);
  // Validate pagination metadata for empty results
  TestValidator.equals(
    "pagination current page",
    emptyByDateResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    emptyByDateResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    emptyByDateResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages count",
    emptyByDateResult.pagination.pages,
    0,
  );
  TestValidator.equals("empty data array", emptyByDateResult.data.length, 0);
  // 4. Test: Query with conflicting actorMemberId and actorGuestId (AND logic - should return empty)
  const conflictingActorsRequest = {
    search: null,
    action: null,
    entityType: null,
    entityId: null,
    actorMemberId: typia.random<string & tags.Format<"uuid">>(),
    actorGuestId: typia.random<string & tags.Format<"uuid">>(),
    ipAddress: null,
    createdAtFrom: null,
    createdAtTo: null,
    sort: null,
    page: 1,
    limit: 20,
  } satisfies IErpHrmActivityLog.IRequest;
  const conflictingActorsResult: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: conflictingActorsRequest,
      },
    );
  typia.assert(conflictingActorsResult);
  // Validate empty results due to conflicting actor filters
  TestValidator.equals(
    "conflicting actors - pagination current",
    conflictingActorsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "conflicting actors - pagination limit",
    conflictingActorsResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "conflicting actors - pagination records",
    conflictingActorsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "conflicting actors - pagination pages",
    conflictingActorsResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "conflicting actors - empty data",
    conflictingActorsResult.data.length,
    0,
  );
  // 5. Test: Query with non-existent entityId
  const nonExistentEntityRequest = {
    search: null,
    action: null,
    entityType: null,
    entityId: typia.random<string & tags.Format<"uuid">>(),
    actorMemberId: null,
    actorGuestId: null,
    ipAddress: null,
    createdAtFrom: null,
    createdAtTo: null,
    sort: null,
    page: 1,
    limit: 20,
  } satisfies IErpHrmActivityLog.IRequest;
  const nonExistentEntityResult: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: nonExistentEntityRequest,
      },
    );
  typia.assert(nonExistentEntityResult);
  // Validate empty results for non-existent entity
  TestValidator.equals(
    "non-existent entity - pagination current",
    nonExistentEntityResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent entity - pagination limit",
    nonExistentEntityResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "non-existent entity - pagination records",
    nonExistentEntityResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent entity - pagination pages",
    nonExistentEntityResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent entity - empty data",
    nonExistentEntityResult.data.length,
    0,
  );
  // 6. Test: Query with specific action filter that doesn't exist
  const nonExistentActionRequest = {
    search: null,
    action: "non_existent_action_" + RandomGenerator.alphaNumeric(8),
    entityType: null,
    entityId: null,
    actorMemberId: null,
    actorGuestId: null,
    ipAddress: null,
    createdAtFrom: null,
    createdAtTo: null,
    sort: null,
    page: 1,
    limit: 20,
  } satisfies IErpHrmActivityLog.IRequest;
  const nonExistentActionResult: IPageIErpHrmActivityLog.ISummary =
    await api.functional.erpHrm.member.organizations.activity_logs.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: nonExistentActionRequest,
      },
    );
  typia.assert(nonExistentActionResult);
  // Validate empty results for non-existent action
  TestValidator.equals(
    "non-existent action - pagination current",
    nonExistentActionResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "non-existent action - pagination limit",
    nonExistentActionResult.pagination.limit,
    20,
  );
  TestValidator.equals(
    "non-existent action - pagination records",
    nonExistentActionResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent action - pagination pages",
    nonExistentActionResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent action - empty data",
    nonExistentActionResult.data.length,
    0,
  );
}
