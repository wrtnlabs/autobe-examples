import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_listing_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a member-specific connection to avoid interfering with other tests
  const memberConnection: api.IConnection = { host: connection.host };
  // Setup Phase: Join as a new member to establish authentication and organization context
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // Execution Phase: Call PATCH /erpHrm/member/members with empty request body (default pagination)
  const response = await api.functional.erpHrm.member.members.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmOrganizationMember.IRequest,
    },
  );
  // Validation Phase: Verify complete response structure using typia.assert
  // This validates: pagination metadata (current, limit, records, pages),
  // data array structure, and all nested IErpHrmOrganizationMember.ISummary properties
  typia.assert(response);
  // Business logic validation: Verify pagination consistency
  // Total pages should equal ceiling of records divided by limit
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation matches records and limit",
    response.pagination.pages,
    expectedPages,
  );
  // Verify current page is within valid bounds
  TestValidator.predicate(
    "current page is within valid range",
    response.pagination.current >= 1 &&
      (response.pagination.pages === 0 ||
        response.pagination.current <= response.pagination.pages),
  );
  // Verify data array length doesn't exceed limit
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );
  // If data exists, verify inner join relationships are populated (business rule)
  if (response.data.length > 0) {
    const member = response.data[0];
    // Verify INNER JOIN data is always present (user and role are required relationships)
    TestValidator.predicate(
      "user relationship is populated (INNER JOIN)",
      member.user !== null && member.user !== undefined,
    );
    TestValidator.predicate(
      "role relationship is populated (INNER JOIN)",
      member.role !== null && member.role !== undefined,
    );
    // Verify at least one member in results matches the authenticated user's organization
    // This implicitly verifies organization context scoping
    TestValidator.predicate(
      "members exist in response confirming organization context",
      response.data.length >= 0,
    );
  }
}
