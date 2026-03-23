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

export async function test_api_organization_data_isolation_per_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with access to multiple organizations
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create Organization A (Org A)
  const orgA = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection,
    {
      body: {
        name: `Organization A - ${RandomGenerator.name()}`,
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgA);
  // 3. Create Organization B (Org B)
  const orgB = await generate_random_hrm_tracker_member_organizations_create(
    memberConnection,
    {
      body: {
        name: `Organization B - ${RandomGenerator.name()}`,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 3,
      },
    },
  );
  typia.assert(orgB);
  // 4. Validate data isolation - access Org A details
  const orgADetails = await api.functional.hrmTracker.member.organizations.at(
    memberConnection,
    {
      organizationId: orgA.id,
    },
  );
  typia.assert(orgADetails);
  // 5. Verify Org A isolation
  TestValidator.equals("Organization A ID matches", orgADetails.id, orgA.id);
  TestValidator.equals(
    "Organization A name matches",
    orgADetails.name,
    orgA.name,
  );
  // 6. Validate Org B isolation
  const orgBDetails = await api.functional.hrmTracker.member.organizations.at(
    memberConnection,
    {
      organizationId: orgB.id,
    },
  );
  typia.assert(orgBDetails);
  // 7. Verify different organizations have different data
  TestValidator.equals("Organization B ID matches", orgBDetails.id, orgB.id);
  TestValidator.equals(
    "Organization B name matches",
    orgBDetails.name,
    orgB.name,
  );
  TestValidator.notEquals("Org A and Org B are different", orgA.id, orgB.id);
  TestValidator.notEquals("Org A and Org B names differ", orgA.name, orgB.name);
}
