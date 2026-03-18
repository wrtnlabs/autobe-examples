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

export async function test_api_organization_logo_retrieval_no_logo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as new member (automatically creates organization without logo)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Get organization_id from member's organization membership
  const organizationMembership = member.organization_memberships[0];
  typia.assert(organizationMembership);
  const organizationId = organizationMembership.organization.id;
  // 3. Retrieve organization logo with member-specific connection
  const logoResponse: IHrmsOrganizationLogo =
    await api.functional.hrms.member.organizations.logo.at(memberConnection, {
      organizationId,
    });
  typia.assert(logoResponse);
  // 4. Validate response
  TestValidator.equals(
    "logo_uri is null for new organization",
    logoResponse.logo_uri,
    null,
  );
  TestValidator.equals(
    "organization_id matches",
    logoResponse.organization_id,
    organizationId,
  );
}
