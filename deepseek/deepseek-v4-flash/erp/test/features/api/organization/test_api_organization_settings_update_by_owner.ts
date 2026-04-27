import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";

export async function test_api_organization_settings_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create organization with initial settings
  const initialName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Update organization settings with different values
  const newName = `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 5 });
  const updated =
    await api.functional.hrmTimeTracking.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: newName,
          description: newDescription,
          currency: "EUR",
          timezone: "Europe/London",
          fiscal_start_month: 7,
        } satisfies IHrmTimeTrackingOrganization.IUpdate,
      },
    );
  typia.assert(updated);
  // 4. Verify all updated values are reflected
  TestValidator.equals("name updated", updated.name, newName);
  TestValidator.equals(
    "description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals("currency updated", updated.currency, "EUR");
  TestValidator.equals("timezone updated", updated.timezone, "Europe/London");
  TestValidator.equals(
    "fiscal_start_month updated",
    updated.fiscal_start_month,
    7,
  );
  // 5. Verify updated_at is newer than created_at
  TestValidator.predicate(
    "updated_at is newer than created_at",
    () =>
      new Date(updated.updated_at).getTime() >
      new Date(updated.created_at).getTime(),
  );
  // 6. Verify the owner reference remains unchanged
  TestValidator.equals(
    "owner id unchanged",
    updated.owner.id,
    organization.owner.id,
  );
  TestValidator.equals(
    "owner email unchanged",
    updated.owner.email,
    organization.owner.email,
  );
}
