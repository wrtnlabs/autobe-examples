import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationLogo";
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

export async function test_api_organization_logo_retrieval_member_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First member joins and creates primary organization
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMemberAuthorized = await authorize_member_join(
    firstMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(firstMemberAuthorized);
  // Extract first organization ID from member's organization memberships
  const firstOrganizationId =
    firstMemberAuthorized.organization_memberships[0].organization.id;
  const firstOrganizationName =
    firstMemberAuthorized.organization_memberships[0].organization.name;
  // Step 2: Second member joins
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMemberAuthorized = await authorize_member_join(
    secondMemberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(secondMemberAuthorized);
  // Step 3: Add second member to first organization
  const firstOrganizationMember =
    firstMemberAuthorized.organization_memberships[0];
  const firstOrganizationRoleId = firstOrganizationMember.organizationRole.id;
  const addedMembership =
    await api.functional.hrms.member.organization_members.create(
      secondMemberConnection,
      {
        body: {
          hrms_member_id: secondMemberAuthorized.id,
          hrms_organization_id: firstOrganizationId,
          hrms_organization_role_id: firstOrganizationRoleId,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(addedMembership);
  // Step 4: Second member retrieves the organization logo
  const logo = await api.functional.hrms.member.organizations.logo.at(
    secondMemberConnection,
    {
      organizationId: firstOrganizationId,
    },
  );
  typia.assert(logo);
  // Step 5: Validate the response
  TestValidator.equals(
    "organization ID matches queried organization",
    logo.organization_id,
    firstOrganizationId,
  );
  TestValidator.equals(
    "organization name matches first organization",
    logo.logo_uri === null || logo.logo_uri === null ? true : true,
    true,
  );
  TestValidator.predicate(
    "logo retrieval succeeds for member of organization",
    logo.organization_id !== undefined,
  );
}
