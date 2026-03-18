import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member!);
  // 2. Get organization from membership
  if (member.organization_memberships.length === 0) {
    throw new Error("No organization found for member");
  }
  const firstMembership = member.organization_memberships[0];
  const organizationId = firstMembership.organization.id;
  // 3. Update organization with partial data
  const newName = RandomGenerator.name(3);
  const newDescription = RandomGenerator.paragraph({ sentences: 2 });
  const updatedOrgResponse =
    await api.functional.hrms.member.organizations.update(memberConnection, {
      organizationId,
      body: {
        name: newName,
        description: newDescription,
      } satisfies IHrmsOrganization.IUpdate,
    });
  typia.assert(updatedOrgResponse!);
  const updatedOrg: IHrmsOrganization.ISummary =
    typia.assert<IHrmsOrganization.ISummary>(updatedOrgResponse);
  // 4. Validate organization update
  TestValidator.equals("organization name updated", updatedOrg.name, newName);
  TestValidator.equals(
    "organization description updated",
    updatedOrg.description,
    newDescription,
  );
}
