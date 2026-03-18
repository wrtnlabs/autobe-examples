import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_logo_upload_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a new member to access member-scoped operations
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create an organization without a logo initially
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          logo_url: null,
        } satisfies Partial<IErpHrmOrganization.ICreate>,
      },
    );
  typia.assert(organization);
  // Verify initial state has no logo
  TestValidator.equals("initial logo_url is null", organization.logo_url, null);
  // Upload a valid logo image URL to the organization
  const logoUrl = typia.random<string & tags.Format<"url">>();
  const updatedOrganization =
    await api.functional.erpHrm.member.organizations.logo.uploadLogo(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          logoUrl: logoUrl,
        } satisfies IErpHrmOrganization.ILogoUpload,
      },
    );
  typia.assert(updatedOrganization);
  // Validate that the response returns the updated organization with the new logo_url field populated
  TestValidator.equals(
    "logo_url matches uploaded value",
    updatedOrganization.logo_url,
    logoUrl,
  );
  // Verify the updated_at timestamp reflects the change
  TestValidator.predicate(
    "updated_at timestamp is newer than original",
    new Date(updatedOrganization.updated_at).getTime() >
      new Date(organization.updated_at).getTime(),
  );
}
