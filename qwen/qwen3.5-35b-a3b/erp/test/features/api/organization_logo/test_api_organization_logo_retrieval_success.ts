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

export async function test_api_organization_logo_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account via signup (automatically creates organization with logo)
  const joinConnection: api.IConnection = { host: connection.host };
  const joined: IHrmsMember.IAuthorized = await authorize_member_join(
    joinConnection,
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
  typia.assert(joined);
  // 2. Verify member belongs to at least one organization
  const orgMemberships = joined.organization_memberships;
  TestValidator.predicate(
    "member belongs to organization",
    orgMemberships.length > 0,
  );
  TestValidator.equals("organization count", orgMemberships.length, 1);
  // 3. Extract organization ID from the membership
  const firstMembership = orgMemberships[0];
  typia.assert(firstMembership);
  const organizationId: string = firstMembership.organization.id;
  TestValidator.predicate(
    "organization_id is non-empty string",
    organizationId.length > 0,
  );
  // 4. Create member connection for logo retrieval
  const logoConnection: api.IConnection = { host: connection.host };
  logoConnection.headers = {
    ...logoConnection.headers,
    Authorization: joined.token.access,
  };
  // 5. Retrieve organization logo using member's authorized connection
  const logo: IHrmsOrganizationLogo =
    await api.functional.hrms.member.organizations.logo.at(logoConnection, {
      organizationId,
    });
  typia.assert(logo);
  // 6. Validate response contains correct organization_id matching path parameter
  TestValidator.equals(
    "organization_id matches path parameter",
    logo.organization_id,
    organizationId,
  );
  // 7. Validate logo_uri is present (organization should have logo from signup)
  TestValidator.predicate(
    "logo_uri is present and valid",
    logo.logo_uri !== null,
  );
  if (logo.logo_uri !== null) {
    TestValidator.predicate(
      "logo_uri is valid URI format",
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(logo.logo_uri),
    );
  }
}
