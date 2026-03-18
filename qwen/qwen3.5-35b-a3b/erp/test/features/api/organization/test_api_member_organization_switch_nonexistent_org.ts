import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_member_organization_switch_nonexistent_org(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with valid credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmsMember.IJoin;
  const memberAuthorized = await authorize_member_join(connection, {
    body: joinInput,
  });
  typia.assert(memberAuthorized);
  // 2. Verify member has at least one organization membership
  const orgAMembership = memberAuthorized.organization_memberships[0];
  typia.assert(orgAMembership);
  // 3. Create member connection for subsequent API calls
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuthorized.email,
      password: joinInput.password,
    } satisfies IHrmsMember.ILogin,
  });
  // 4. Generate non-existent organization UUID
  const nonExistentOrgId = "00000000-0000-0000-0000-000000000000";
  // 5. Attempt to switch to non-existent organization - should return 404
  await TestValidator.httpError(
    "should return 404 for non-existent organization",
    404,
    async () => {
      await api.functional.hrms.member.organizations._switch.switchOrganization(
        memberConnection,
        {
          body: {
            ...typia.random<IHrmsOrganization.IRequest>(),
            organizationId: nonExistentOrgId,
          } as IHrmsOrganization.IRequest & {
            organizationId: string;
          },
        },
      );
    },
  );
  // 6. Verify member's organization context remains unchanged
  const currentMemberships = memberAuthorized.organization_memberships;
  TestValidator.equals(
    "member still has same organizations after failed switch",
    1,
    currentMemberships.length,
  );
}
