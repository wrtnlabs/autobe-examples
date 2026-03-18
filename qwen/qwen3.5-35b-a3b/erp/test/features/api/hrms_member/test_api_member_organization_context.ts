import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMember";
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

export async function test_api_member_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Use pre-existing organizations (hardcoded UUIDs for test)
  const orgA_id = "11111111-1111-1111-1111-111111111111";
  const orgB_id = "22222222-2222-2222-2222-222222222222";
  const orgC_id = "33333333-3333-3333-3333-333333333333";
  const role_id = "00000000-0000-0000-0000-000000000001";
  // Register 3 members
  const member1Auth = await authorize_member_join(connection, {
    body: {
      email: "member1@test.com",
      password: "password123",
      display_name: "Member One",
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member1Auth);
  const member2Auth = await authorize_member_join(connection, {
    body: {
      email: "member2@test.com",
      password: "password123",
      display_name: "Member Two",
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member2Auth);
  const member3Auth = await authorize_member_join(connection, {
    body: {
      email: "member3@test.com",
      password: "password123",
      display_name: "Member Three",
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member3Auth);
  // Create memberships - Member 1 in Org A
  await api.functional.hrms.member.organization_members.create(
    {
      host: connection.host,
      headers: { Authorization: member1Auth.token.access },
    },
    {
      body: {
        hrms_member_id: member1Auth.id,
        hrms_organization_id: orgA_id,
        hrms_organization_role_id: role_id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // Create memberships - Member 2 in Org B
  await api.functional.hrms.member.organization_members.create(
    {
      host: connection.host,
      headers: { Authorization: member2Auth.token.access },
    },
    {
      body: {
        hrms_member_id: member2Auth.id,
        hrms_organization_id: orgB_id,
        hrms_organization_role_id: role_id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // Create memberships - Member 3 in Org B and Org C (multi-org membership)
  await api.functional.hrms.member.organization_members.create(
    {
      host: connection.host,
      headers: { Authorization: member3Auth.token.access },
    },
    {
      body: {
        hrms_member_id: member3Auth.id,
        hrms_organization_id: orgB_id,
        hrms_organization_role_id: role_id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  await api.functional.hrms.member.organization_members.create(
    {
      host: connection.host,
      headers: { Authorization: member3Auth.token.access },
    },
    {
      body: {
        hrms_member_id: member3Auth.id,
        hrms_organization_id: orgC_id,
        hrms_organization_role_id: role_id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // Test: member_1 can see only members from their organization (Org A)
  const member1List = await api.functional.hrms.members.index(
    {
      host: connection.host,
      headers: { Authorization: member1Auth.token.access },
    },
    {
      body: {
        hrms_organization_id: orgA_id,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(member1List);
  TestValidator.equals(
    "member_1 org list: should see only member_1",
    member1List.data.length,
    1,
  );
  TestValidator.equals(
    "member_1 org list: should see member_1",
    member1List.data[0].email,
    "member1@test.com",
  );
  // Test: member_2 can see only members from their organization (Org B)
  const member2List = await api.functional.hrms.members.index(
    {
      host: connection.host,
      headers: { Authorization: member2Auth.token.access },
    },
    {
      body: {
        hrms_organization_id: orgB_id,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(member2List);
  TestValidator.equals(
    "member_2 org list: should see member_2 and member_3",
    member2List.data.length,
    2,
  );
  // Test: member_3 can see members from both their organizations
  // Org B members: member_2, member_3
  const member3ListOrgB = await api.functional.hrms.members.index(
    {
      host: connection.host,
      headers: { Authorization: member3Auth.token.access },
    },
    {
      body: {
        hrms_organization_id: orgB_id,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(member3ListOrgB);
  TestValidator.equals(
    "member_3 org B list: should see member_2 and member_3",
    member3ListOrgB.data.length,
    2,
  );
  // Org C members: only member_3
  const member3ListOrgC = await api.functional.hrms.members.index(
    {
      host: connection.host,
      headers: { Authorization: member3Auth.token.access },
    },
    {
      body: {
        hrms_organization_id: orgC_id,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(member3ListOrgC);
  TestValidator.equals(
    "member_3 org C list: should see only member_3",
    member3ListOrgC.data.length,
    1,
  );
  // Test: Validate sensitive data exclusion - no password_hash in summaries
  for (const member of member1List.data) {
    typia.assert(member);
    TestValidator.equals(
      "member summary: password_hash should be excluded",
      "password_hash" in member,
      false,
    );
  }
  // Test: Validate relation arrays excluded - organization_memberships not in summary
  for (const member of member1List.data) {
    typia.assert(member);
    TestValidator.equals(
      "member summary: organization_memberships should be excluded",
      "organization_memberships" in member,
      false,
    );
  }
  // Test: Validate organization_membership_count field exists in summary
  for (const member of member1List.data) {
    typia.assert(member);
    TestValidator.equals(
      "member summary: organization_membership_count should exist",
      typeof member.organization_membership_count,
      "number",
    );
  }
}
