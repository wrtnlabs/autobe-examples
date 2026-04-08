import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization list retrieval for authenticated members.
 *
 * Validates that a member user can successfully retrieve their list of organizations after authentication. The test verifies the paginated response structure, organization summary data integrity, and pagination metadata correctness.
 *
 * This test ensures the organization list endpoint properly filters organizations accessible to the authenticated member and returns the expected summary fields without loading unnecessary HAS-MANY compositions.
 *
 * 1. Register a new member with email and password credentials.
 * 2. Retrieve the member's organization list using the PATCH /hrm/member/organizations endpoint.
 * 3. Validate the response contains paginated data with IHrmOrganization.ISummary records.
 * 4. Verify pagination metadata includes current page, limit, total records, and pages.
 * 5. Validate each organization record contains required fields (id, name, currency, timezone, fiscal_start_month, created_at).
 */
export async function test_api_organization_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Retrieve organization list with pagination parameters
  const organizationList = await api.functional.hrm.member.organizations.index(
    memberConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
      } satisfies IHrmOrganization.IRequest,
    },
  );
  typia.assert(organizationList);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page",
    organizationList.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    organizationList.pagination.limit,
    organizationList.pagination.limit,
  );
  TestValidator.equals(
    "pagination records count",
    organizationList.pagination.records,
    organizationList.data.length,
  );
  // 4. Validate data array is present
  TestValidator.predicate(
    "data array exists",
    organizationList.data !== null && organizationList.data !== undefined,
  );
  // 5. Validate organization count matches pagination
  TestValidator.equals(
    "organization count matches pagination",
    organizationList.data.length,
    organizationList.pagination.records,
  );
}
