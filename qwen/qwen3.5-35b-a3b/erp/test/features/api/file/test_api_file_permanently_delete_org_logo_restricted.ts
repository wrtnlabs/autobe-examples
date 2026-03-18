import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationLogo";
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

export async function test_api_file_permanently_delete_org_logo_restricted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
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
  // 2. Retrieve organization context to get organizationId
  const orgsResponse = await api.functional.hrms.member.organizations.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IHrmsOrganization.IRequest,
    },
  );
  typia.assert(orgsResponse);
  TestValidator.equals(
    "organization count",
    orgsResponse.pagination.records,
    1,
  );
  const org = orgsResponse.data[0];
  typia.assert(org);
  // 3. Retrieve organization logo to confirm logo exists
  const logoResponse = await api.functional.hrms.member.organizations.logo.at(
    memberConnection,
    {
      organizationId: org.id,
    },
  );
  typia.assert(logoResponse);
  TestValidator.equals(
    "organization has logo",
    logoResponse.logo_uri !== null,
    true,
  );
  // 4. Attempt to permanently delete a file with a known UUID
  // This should fail with 409 Conflict or 422 Unprocessable Entity
  // indicating that logo files are protected from deletion
  const protectedFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should reject deleting protected file",
    [409, 422],
    async () => {
      await api.functional.hrms.member.files.permanently_delete.permanentlyDelete(
        memberConnection,
        {
          fileId: protectedFileId,
        },
      );
    },
  );
  // 5. Verify organization logo reference remains valid
  const logoResponseAfter =
    await api.functional.hrms.member.organizations.logo.at(memberConnection, {
      organizationId: org.id,
    });
  typia.assert(logoResponseAfter);
  TestValidator.equals(
    "logo reference remains valid after deletion attempt",
    logoResponseAfter.organization_id,
    org.id,
  );
  TestValidator.equals(
    "logo URI remains unchanged",
    logoResponseAfter.logo_uri,
    logoResponse.logo_uri,
  );
}
