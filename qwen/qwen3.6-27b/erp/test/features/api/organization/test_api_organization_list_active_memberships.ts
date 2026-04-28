import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";

/**
 * Test listing organizations where authenticated member has active membership.
 *
 * Validates the complete workflow of members joining multiple organizations and retrieving their active organizational memberships. Two members join the platform, each receiving a default organization. One member is then invited to the other's organization, establishing a second active membership. The listing endpoint is called to verify both organizations are returned with correct summary details and proper pagination metadata.
 *
 * Special attention is given to verifying that the response structure matches IPageIHrmPlatformOrganization.ISummary with accurate pagination information and organization summary fields including identity attributes (id, name, description, logo_uri), operational settings (currency, timezone, fiscal_start_month), and creation timestamps.
 *
 * 1. First member joins the platform, receiving default organization A.
 * 2. Second member joins the platform, receiving default organization B.
 * 3. Second member invites first member as an employee in organization B.
 * 4. First member lists organizations via PATCH /hrmPlatform/organizations.
 * 5. Validates response contains both organizations with proper structure and pagination.
 */
export async function test_api_organization_list_active_memberships(
  connection: api.IConnection,
) {
  // 1. First member joins - creates organization A
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(member1);
  // 2. Second member joins - creates organization B
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(member2);
  // 3. Second member invites first member to organization B
  const employee: IHrmPlatformEmployee =
    await generate_random_hrm_platform_member_employees_create(
      member2Connection,
      {
        body: {
          memberId: member1.id,
          employmentType: "full-time" as const,
        },
      },
    );
  typia.assert(employee);
  TestValidator.equals(
    "employee linked to first member",
    employee.member.id,
    member1.id,
  );
  // 4. First member lists organizations
  const result: IPageIHrmPlatformOrganization.ISummary =
    await api.functional.hrmPlatform.organizations.index(member1Connection, {
      body: {} satisfies IHrmPlatformOrganization.IRequest,
    });
  typia.assert(result);
  // 5. Validate response structure
  TestValidator.predicate(
    "two organizations returned",
    result.data.length === 2,
  );
  TestValidator.equals(
    "total records matches data length",
    result.pagination.records,
    result.data.length,
  );
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  // Verify both organization summaries have valid structure
  for (const org of result.data) {
    typia.assert(org satisfies IHrmPlatformOrganization.ISummary);
  }
}
