import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_settings_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Get organization list to find an organization to update
  const organizations =
    await api.functional.hrmTracker.member.organizations.index(
      memberConnection,
      {
        body: typia.random<IHrmTrackerOrganization.IRequest>(),
      },
    );
  typia.assert(organizations);
  // Skip if no organizations available
  if (organizations.data.length === 0) {
    return;
  }
  const targetOrganization = organizations.data[0];
  // 3. Update organization settings
  const updateBody: IHrmTrackerOrganization.IUpdate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: 1,
  };
  const updated = await api.functional.hrmTracker.member.organizations.update(
    memberConnection,
    {
      organizationId: targetOrganization.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // 4. Validate updated fields
  TestValidator.equals("name updated", updated.name, updateBody.name);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "currency updated",
    updated.currency,
    updateBody.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updated.timezone,
    updateBody.timezone,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updated.fiscal_start_month,
    updateBody.fiscal_start_month,
  );
}
