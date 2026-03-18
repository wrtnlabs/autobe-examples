import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLogDetail";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLogDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLogDetail";
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

export async function test_api_activity_log_detail_filter_by_value_partial(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization
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
  // 3. Query activity log details with value filter for partial matching
  const searchValue = RandomGenerator.alphabets(5);
  const response =
    await api.functional.erpHrm.member.organizations.activity_logs.details.index(
      memberConnection,
      {
        organizationId: organization.id,
        activityLogId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          value: searchValue,
        } satisfies IErpHrmActivityLogDetail.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate partial match - returned records should contain search term
  for (const detail of response.data) {
    if (detail.value !== null) {
      TestValidator.predicate(
        "detail value contains search term (case-insensitive partial match)",
        detail.value.toLowerCase().includes(searchValue.toLowerCase()),
      );
    }
  }
}
