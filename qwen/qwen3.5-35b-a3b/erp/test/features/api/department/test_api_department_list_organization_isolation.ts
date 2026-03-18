import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a member who will have multiple organization memberships
  const joinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Get organizations the member belongs to
  const memberOrgs = member.organization_memberships;
  TestValidator.predicate(
    "Member has at least 2 organization memberships",
    memberOrgs.length >= 2,
  );
  // 3. Get the first two organizations
  const orgA = memberOrgs[0].organization;
  const orgB = memberOrgs[1].organization;
  // 4. Test department listing for Organization A
  const viewConnectionA: api.IConnection = { host: connection.host };
  viewConnectionA.headers = {
    ...viewConnectionA.headers,
    Authorization: `Bearer ${member.token.access}`,
  };
  const deptResultA =
    await api.functional.hrms.member.organizations.departments.index(
      viewConnectionA,
      {
        organizationId: orgA.id,
        body: {},
      },
    );
  typia.assert(deptResultA);
  // 5. Verify all returned departments belong to Organization A
  for (const dept of deptResultA.data) {
    TestValidator.equals(
      `Department ${dept.id} belongs to Organization A`,
      dept.organization_id,
      orgA.id,
    );
  }
  // 6. Test department listing for Organization B
  const viewConnectionB: api.IConnection = { host: connection.host };
  viewConnectionB.headers = {
    ...viewConnectionB.headers,
    Authorization: `Bearer ${member.token.access}`,
  };
  const deptResultB =
    await api.functional.hrms.member.organizations.departments.index(
      viewConnectionB,
      {
        organizationId: orgB.id,
        body: {},
      },
    );
  typia.assert(deptResultB);
  // 7. Verify all returned departments belong to Organization B
  for (const dept of deptResultB.data) {
    TestValidator.equals(
      `Department ${dept.id} belongs to Organization B`,
      dept.organization_id,
      orgB.id,
    );
  }
  // 8. Test organization switching
  const switchConnection: api.IConnection = { host: connection.host };
  switchConnection.headers = {
    ...switchConnection.headers,
    Authorization: `Bearer ${member.token.access}`,
  };
  const switchedOrg =
    await api.functional.hrms.member.organizations._switch.switchOrganization(
      switchConnection,
      {
        body: typia.random<IHrmsOrganization.IRequest>(),
      },
    );
  typia.assert(switchedOrg);
  // 9. Verify no data leakage between organizations
  const resultAIds = deptResultA.data.map((d) => d.id);
  const resultBIds = deptResultB.data.map((d) => d.id);
  const overlap = resultAIds.some((idA) => resultBIds.includes(idA));
  TestValidator.predicate(
    "No data leakage - departments are completely separate",
    !overlap,
  );
}
