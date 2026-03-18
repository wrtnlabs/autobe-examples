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

export async function test_api_organization_logo_remove_when_already_null(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization without a logo (logo_url is null by default)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_year_start_month: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
          description: null,
          logo_url: null,
        } satisfies IErpHrmOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Verify logo_url is initially null
  TestValidator.predicate(
    "logo_url is initially null",
    organization.logo_url === null,
  );
  // 3. Attempt to remove logo when it's already null
  // According to spec, this should succeed gracefully without modification
  await api.functional.erpHrm.member.organizations.logo.erase(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  // 4. If we reach here, the operation completed successfully
  // No assertion needed - success means the defensive programming worked
}
