import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test edge case where authenticated member has no projects in their organization.
 *
 * Validates that a newly authenticated member sees an empty project list in their default organization. Confirms organization isolation boundaries by ensuring zero projects are returned with proper pagination metadata. Verifies the response structure contains pagination object and empty data array.
 *
 * 1. Authenticate as new member via authorize_member_join utility.
 * 2. Create isolated member connection for API calls.
 * 3. Call PATCH /hrmPlatform/member/projects with no filters.
 * 4. Verify response contains empty data array: [].
 * 5. Verify pagination metadata: current=1, limit=20 (default), records=0, pages=0.
 * 6. Verify response structure has pagination and data properties.
 * 7. Verify organization isolation - zero projects confirms strict tenancy boundaries.
 */
export async function test_api_projects_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as new member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {} satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(member);
  // 2. Verify member is authenticated
  TestValidator.predicate("member authenticated", member.id !== undefined);
  TestValidator.predicate(
    "member has token",
    member.token.access !== undefined,
  );
  // 3. Call PATCH /hrmPlatform/member/projects with no filters
  const body: IHrmPlatformProject.IRequest = {};
  const response: IPageIHrmPlatformProject.ISummary =
    await api.functional.hrmPlatform.member.projects.index(memberConnection, {
      body: body satisfies IHrmPlatformProject.IRequest,
    });
  typia.assert(response);
  // 4. Verify empty data array
  TestValidator.equals("empty data array", response.data, []);
  TestValidator.predicate("data array exists", response.data !== undefined);
  // 5. Verify pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  TestValidator.equals("records count is 0", response.pagination.records, 0);
  TestValidator.equals("pages count is 0", response.pagination.pages, 0);
  // 6. Verify response structure
  TestValidator.predicate(
    "has pagination property",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data property", response.data !== undefined);
  // 7. Verify organization isolation - empty results confirm tenancy boundaries
  TestValidator.equals(
    "zero projects in new organization",
    response.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination reflects empty state",
    response.pagination.records === 0,
  );
}
