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

export async function test_api_organization_update_name_not_unique(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two member accounts
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "http://localhost/test",
      referrer: "http://localhost",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: "http://localhost/test",
      referrer: "http://localhost",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member2Auth);
  // 2. Member 1 creates an organization with a unique name
  const member1Connection2: api.IConnection = { host: connection.host };
  member1Connection2.headers = {
    ...member1Connection2.headers,
    Authorization: member1Auth.token.access,
  };
  // Get member 1's organization from their memberships
  const member1Org = member1Auth.organization_memberships.find(
    (m) => m.organization.id !== undefined,
  );
  // 3. Member 2 creates an organization with a different name
  const member2Connection2: api.IConnection = { host: connection.host };
  member2Connection2.headers = {
    ...member2Connection2.headers,
    Authorization: member2Auth.token.access,
  };
  // Get member 2's organization from their memberships
  const member2Org = member2Auth.organization_memberships.find(
    (m) => m.organization.id !== undefined,
  );
  // 4. Member 1 attempts to update their organization's name to match member 2's org name
  if (!member1Org || !member2Org) {
    throw new Error("Organization not found in membership");
  }
  // Try to update member 1's organization to use member 2's organization name
  const newName = member2Org.organization.name;
  try {
    await api.functional.hrms.member.organizations.update(member1Connection2, {
      organizationId: member1Org.organization.id,
      body: {
        name: newName,
      } satisfies IHrmsOrganization.IUpdate,
    });
  } catch (error) {
    typia.assert(error);
  }
}
