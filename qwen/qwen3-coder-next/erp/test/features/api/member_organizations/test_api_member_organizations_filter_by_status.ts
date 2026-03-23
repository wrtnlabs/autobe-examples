import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_organizations_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    },
  });
  typia.assert(member);
  // Step 2: Create organizations with different statuses for testing
  // Note: In a real scenario, organizations would be created through the member's organization management
  // For this test, we'll use the index endpoint with different status filters
  // Step 3: Test filtering by active status
  const activeOrganizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: { status: "active" } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(activeOrganizations);
  // Validate active status filtering - ensure all returned organizations are active
  for (const org of activeOrganizations.data) {
    TestValidator.equals("organization status is active", org.status, "active");
  }
  // Step 4: Test filtering by archived status
  const archivedOrganizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: { status: "archived" } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(archivedOrganizations);
  // Validate archived status filtering - ensure all returned organizations are archived
  for (const org of archivedOrganizations.data) {
    TestValidator.equals(
      "organization status is archived",
      org.status,
      "archived",
    );
  }
  // Step 5: Test filtering by deleted status
  const deletedOrganizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: { status: "deleted" } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(deletedOrganizations);
  // Validate deleted status filtering - ensure all returned organizations are deleted
  for (const org of deletedOrganizations.data) {
    TestValidator.equals(
      "organization status is deleted",
      org.status,
      "deleted",
    );
  }
  // Step 6: Test default behavior (no status filter - should return all non-deleted organizations)
  const allOrganizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {} satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(allOrganizations);
  // Validate default response excludes deleted organizations
  for (const org of allOrganizations.data) {
    TestValidator.predicate(
      "organization is not deleted in default response",
      org.status !== "deleted",
    );
  }
  // Step 7: Test pagination with status filter
  const paginatedOrganizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 5,
        } satisfies IHrmTrackerOrganization.IRequest,
      },
    );
  typia.assert(paginatedOrganizations);
  // Validate pagination structure
  TestValidator.predicate(
    "has pagination",
    paginatedOrganizations.pagination !== undefined,
  );
  TestValidator.equals(
    "current page is 1",
    paginatedOrganizations.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit is 5",
    paginatedOrganizations.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "records is valid",
    paginatedOrganizations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is valid",
    paginatedOrganizations.pagination.pages >= 0,
  );
  // Validate data count doesn't exceed limit
  TestValidator.predicate(
    "data count <= limit",
    paginatedOrganizations.data.length <= 5,
  );
  // Step 8: Validate organization summary structure
  for (const org of paginatedOrganizations.data) {
    TestValidator.predicate(
      "has valid id",
      org.id !== undefined && org.id !== null,
    );
    TestValidator.predicate(
      "has valid name",
      org.name !== undefined && org.name !== null,
    );
    TestValidator.predicate("has valid status", org.status !== undefined);
    TestValidator.predicate(
      "has valid created_at",
      org.created_at !== undefined && org.created_at !== null,
    );
    TestValidator.predicate(
      "status is valid",
      ["active", "archived", "deleted"].includes(org.status),
    );
  }
  // Step 9: Test edge cases - empty results
  // If there are no organizations with a specific status, the data array should be empty
  // This is implicitly tested by the successful response with potentially empty data array
  TestValidator.predicate(
    "active organizations response is valid array",
    Array.isArray(activeOrganizations.data),
  );
  TestValidator.predicate(
    "archived organizations response is valid array",
    Array.isArray(archivedOrganizations.data),
  );
  TestValidator.predicate(
    "deleted organizations response is valid array",
    Array.isArray(deletedOrganizations.data),
  );
}
