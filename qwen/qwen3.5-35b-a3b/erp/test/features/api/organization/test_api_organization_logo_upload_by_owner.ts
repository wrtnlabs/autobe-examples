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

interface IOrganizationLogoResponse {
  id: string;
  logo_uri: string | null;
}

export async function test_api_organization_logo_upload_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Verify member has at least one organization
  TestValidator.predicate(
    "member has organizations",
    memberAuth.organization_memberships.length > 0,
  );
  // Get the owner organization (first organization where member is owner)
  const ownerMembership = memberAuth.organization_memberships.find(
    (m) => m.organizationRole.name === "Owner",
  );
  TestValidator.predicate(
    "member has owner role in organization",
    ownerMembership !== undefined,
  );
  const organizationId = ownerMembership!.organization.id;
  // Step 3: Create member connection for logo upload
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // Step 4: Upload logo
  const logoUri = typia.random<string & tags.Format<"uri">>();
  const uploadResponse =
    await api.functional.hrms.member.organizations.logo.updateLogo(
      memberConnection,
      {
        organizationId,
        body: {
          file: logoUri,
        },
      },
    );
  const validatedResponse = typia.assert<IOrganizationLogoResponse>(uploadResponse);
  // Step 5: Validate response
  TestValidator.equals(
    "organization id matches",
    validatedResponse.id,
    organizationId,
  );
  TestValidator.equals("logo uri updated", validatedResponse.logo_uri, logoUri);
  TestValidator.predicate(
    "logo uri is not null",
    validatedResponse.logo_uri !== null,
  );
}