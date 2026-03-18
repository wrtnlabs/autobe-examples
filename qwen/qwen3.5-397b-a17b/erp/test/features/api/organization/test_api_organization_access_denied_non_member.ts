import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_employees_create } from "../../../generate/generate_random_hrm_platform_member_employees_create";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_employee } from "../../../prepare/prepare_random_hrm_platform_employee";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_organization_access_denied_non_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (Member A) who will attempt unauthorized access
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create organization for Member A (Org A)
  const orgA = await generate_random_hrm_platform_member_organizations_create(
    memberAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgA);
  // 3. Create second member (Member B) who owns the target organization
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 4. Create organization for Member B (Org B) - this is the target organization
  const orgB = await generate_random_hrm_platform_member_organizations_create(
    memberBConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "KRW",
        timezone: "America/New_York",
        fiscal_start_month: 6,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(orgB);
  // 5. Member A attempts to access Org B's details (should fail with 403)
  // This tests organization data isolation - Member A has no membership in Org B
  // The backend verifies membership through hrm_platform_employees table
  // and returns 403 Forbidden when no employee record links the member to the organization
  await TestValidator.httpError(
    "member cannot access organization they don't belong to",
    403,
    async () => {
      await api.functional.hrmPlatform.member.organizations.at(
        memberAConnection,
        {
          organizationId: orgB.id,
        },
      );
    },
  );
  // 6. Verify Member B CAN access their own organization (sanity check)
  const orgBDetails = await api.functional.hrmPlatform.member.organizations.at(
    memberBConnection,
    {
      organizationId: orgB.id,
    },
  );
  typia.assert(orgBDetails);
  TestValidator.equals("organization ID matches", orgBDetails.id, orgB.id);
}
