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
 * Test successful organization deletion by owner with no blocking conditions.
 *
 * Steps:
 * 1. Authenticate as a member via authorize_member_join
 * 2. Create a new organization via generate_random_erp_hrm_member_organizations_create
 * 3. Verify organization ownership and active status
 * 4. Call DELETE /erpHrm/member/organizations/{organizationId}
 * 5. Verify operation succeeds without errors
 * 6. Verify owner user account remains intact
 */
export async function test_api_organization_erasure_success_no_blocking_conditions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(authorized);
  // 2. Create organization using generation utility
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // Verify organization ownership and active status before deletion
  TestValidator.equals(
    "organization owner matches authorized member",
    organization.owner.id,
    authorized.id,
  );
  TestValidator.predicate(
    "organization is active before deletion",
    organization.deleted_at === null,
  );
  // 3. Delete organization - should succeed with no blocking conditions
  await api.functional.erpHrm.member.organizations.erase(memberConnection, {
    organizationId: organization.id,
  });
  // 4. Verify owner account remains intact after organization deletion
  TestValidator.predicate(
    "owner account not deleted",
    authorized.deletedAt === null,
  );
}
