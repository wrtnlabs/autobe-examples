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

export async function test_api_organization_logo_remove_forbidden_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create owner (User A) and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {} satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(owner);
  // Create organization with logo as User A
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        logo_url: typia.random<string & tags.Format<"url">>(),
      } satisfies DeepPartial<IErpHrmOrganization.ICreate>,
    });
  typia.assert(organization);
  // Create non-owner (User B) and authenticate
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  const nonOwner = await authorize_member_join(nonOwnerConnection, {
    body: {} satisfies DeepPartial<IErpHrmMember.IJoin>,
  });
  typia.assert(nonOwner);
  // Attempt to delete logo as non-owner should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner member should receive 403 Forbidden when attempting to delete organization logo",
    403,
    async () => {
      await api.functional.erpHrm.member.organizations.logo.erase(
        nonOwnerConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}
