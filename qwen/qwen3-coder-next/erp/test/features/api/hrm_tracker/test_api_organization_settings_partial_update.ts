import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_tracker_member_organizations_create } from "../../../generate/generate_random_hrm_tracker_member_organizations_create";
import { prepare_random_hrm_tracker_organization } from "../../../prepare/prepare_random_hrm_tracker_organization";

export async function test_api_organization_settings_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization with complete settings
  const org = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_uri: null,
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(org);
  // 3. Store original values for non-updated fields
  const originalValues = {
    description: org.description,
    logo_image_uri: org.logo_image_uri,
    currency: org.currency,
    fiscal_start_month: org.fiscal_start_month,
  };
  // 4. Update only timezone and fiscal_start_month
  const updatedOrg =
    await api.functional.hrmTracker.member.settings.updateSettings(
      memberConnection,
      {
        body: {
          timezone: "Asia/Seoul",
          fiscal_start_month: 4 satisfies number as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        },
      },
    );
  typia.assert(updatedOrg);
  // 5. Verify partial update results
  TestValidator.equals("timezone updated", updatedOrg.timezone, "Asia/Seoul");
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrg.fiscal_start_month,
    4,
  );
  TestValidator.equals(
    "description retained",
    updatedOrg.description,
    originalValues.description,
  );
  TestValidator.equals(
    "logo_image_uri retained",
    updatedOrg.logo_image_uri,
    originalValues.logo_image_uri,
  );
  TestValidator.equals(
    "currency retained",
    updatedOrg.currency,
    originalValues.currency,
  );
}
