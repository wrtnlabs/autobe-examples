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
 * Test that only the organization owner can update organization settings.
 * Non-owner members should receive 403 Forbidden when attempting to update.
 */
export async function test_api_organization_update_authorization_owner_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner member and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create organization (creator becomes owner automatically)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      ownerConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create non-owner member and authenticate
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {});
  // 4. Non-owner attempts to update organization (should fail with 403 Forbidden)
  const updateBody: IErpHrmOrganization.IUpdate = {
    name: RandomGenerator.name(),
  };
  await TestValidator.httpError(
    "non-owner cannot update organization",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.update(
        nonOwnerConnection,
        {
          organizationId: organization.id,
          body: updateBody,
        },
      );
    },
  );
}
