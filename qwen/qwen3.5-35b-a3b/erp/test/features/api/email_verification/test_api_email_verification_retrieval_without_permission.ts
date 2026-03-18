import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_organizations_roles_create } from "../../../generate/generate_random_hrms_member_organizations_roles_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";
import { prepare_random_hrms_organization_role } from "../../../prepare/prepare_random_hrms_organization_role";

export async function test_api_email_verification_retrieval_without_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member (member A) who will trigger email verification
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberA);
  // Step 2: Get member A's organization ID from their account
  const orgResponse = await api.functional.hrms.member.organizations.index(
    memberAConnection,
    {
      body: { limit: 1, page: 1 },
    },
  );
  typia.assert(orgResponse);
  TestValidator.equals(
    "member A has at least one organization",
    orgResponse.pagination.records,
    1,
  );
  const organizationId = orgResponse.data[0].id;
  // Step 3: Create custom role in organization without email:manage permission
  const roleWithoutEmailManage =
    await api.functional.hrms.member.organizations.roles.create(
      memberAConnection,
      {
        organizationId,
        body: {
          name: "Restricted Employee",
          permissions: [
            "employee:view",
            "time:view",
            "project:view",
          ] as string[],
        } satisfies IHrmsOrganizationRole.ICreate,
      },
    );
  typia.assert(roleWithoutEmailManage);
  TestValidator.equals(
    "role created without email:manage permission",
    roleWithoutEmailManage.permissions.includes("email:manage"),
    false,
  );
  // Step 4: Create second member (member B) and assign to organization with restricted role
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberB);
  // Assign member B to organization with restricted role
  await api.functional.hrms.member.organization_members.create(
    memberBConnection,
    {
      body: {
        hrms_member_id: memberB.id,
        hrms_organization_id: organizationId,
        hrms_organization_role_id: roleWithoutEmailManage.id,
      } satisfies IHrmsOrganizationMember.ICreate,
    },
  );
  // Step 5: Generate a valid verification ID to test access control
  // Note: In a real scenario, we would retrieve the actual verification ID from member A
  // Since there's no list endpoint, we test that ANY valid UUID triggers proper access control
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 6: As member B (restricted role), attempt to retrieve the email verification
  // This should return 403 Forbidden due to missing email:manage permission
  await TestValidator.httpError(
    "should return 403 Forbidden when user lacks email:manage permission",
    403,
    async () => {
      await api.functional.hrms.member.email_verifications.at(
        memberBConnection,
        { verificationId },
      );
    },
  );
}
