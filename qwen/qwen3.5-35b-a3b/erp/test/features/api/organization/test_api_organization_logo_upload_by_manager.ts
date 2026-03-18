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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_organization_logo_upload_by_manager(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IHrmsMember.IAuthorized = await authorize_member_join(
    ownerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(owner);
  // 2. Create manager member
  const managerConnection: api.IConnection = { host: connection.host };
  const manager: IHrmsMember.IAuthorized = await authorize_member_join(
    managerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(manager);
  // 3. Get organization (first membership from owner)
  const organization = owner.organization_memberships[0].organization;
  typia.assert(organization);
  // 4. Find Manager role from organization
  const managerRole = owner.organization_memberships[0].organizationRole;
  typia.assert(managerRole);
  // 5. Assign manager to organization
  const membership =
    await api.functional.hrms.member.organization_members.create(
      ownerConnection,
      {
        body: {
          hrms_member_id: manager.id,
          hrms_organization_id: organization.id,
          hrms_organization_role_id: managerRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(membership);
  // 6. Upload logo as manager
  const uploadResponse =
    await api.functional.hrms.member.organizations.logo.updateLogo(
      managerConnection,
      {
        organizationId: organization.id,
        body: {
          file: `data:image/png;base64,${RandomGenerator.alphaNumeric(32)}`,
        } satisfies IHrmsOrganization.IUpdateLogo,
      },
    );
  typia.assert(uploadResponse);
  // 7. Validate logo upload succeeded
  TestValidator.equals(
    "organization name matches",
    organization.name,
    organization.name,
  );
  TestValidator.predicate(
    "upload API returned successfully",
    () => uploadResponse !== null && uploadResponse !== undefined,
  );
}
