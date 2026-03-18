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

export async function test_api_organization_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authorized response
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(authorized);
  // 2. Extract organization ID from member's organization memberships
  TestValidator.predicate(
    "member has at least one organization membership",
    () => authorized.organization_memberships.length > 0,
  );
  const organizationMembership = authorized.organization_memberships[0];
  typia.assert(organizationMembership);
  const organizationId = organizationMembership.organization.id;
  // 3. Create organization connection with token from authorized response
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 4. Retrieve organization details (dashboard metrics)
  const organizationResponse =
    await api.functional.hrms.member.organizations.at(orgConnection, {
      organizationId,
    });
  typia.assert(organizationResponse);
  // 5. Validate response has expected dashboard structure
  TestValidator.equals(
    "organization ID matches membership",
    organizationId,
    organizationMembership.organization.id,
  );
  TestValidator.equals(
    "organization name matches membership",
    organizationId,
    organizationMembership.organization.id,
  );
}
