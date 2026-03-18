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

/**
 * Test the complete organization setup and onboarding scenario that includes
 * logo upload as part of the initial organization creation flow. After member
 * registration via join and organization creation, complete the setup by
 * uploading the organization logo to establish visual identity.
 */
export async function test_api_organization_onboarding_logo_setup(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register as a new member to begin the onboarding flow
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create initial organization during the setup process
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Step 3: Upload organization logo to establish visual identity
  const logoUrl = typia.random<string & tags.Format<"url">>();
  const updatedOrganization =
    await api.functional.erpHrm.member.organizations.logo.uploadLogo(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          logoUrl,
        } satisfies IErpHrmOrganization.ILogoUpload,
      },
    );
  typia.assert(updatedOrganization);
  // Step 4: Validate that the logo was successfully associated with the organization
  TestValidator.equals(
    "logo URL matches uploaded value",
    updatedOrganization.logo_url,
    logoUrl,
  );
}
