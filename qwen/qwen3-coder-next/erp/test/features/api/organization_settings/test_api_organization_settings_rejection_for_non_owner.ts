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

export async function test_api_organization_settings_rejection_for_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create organization as admin (owner)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12341234",
      display_name: "Admin User",
    },
  });
  const org = await api.functional.hrmTracker.member.organizations.create(
    adminConnection,
    {
      body: typia.random<IHrmTrackerOrganization.ICreate>(),
    },
  );
  typia.assert(org);
  // 2. Non-owner member joins organization
  const managerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(managerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      display_name: "Manager User",
    },
  });
  typia.assert(member);
  // 3. Non-owner member attempts to update organization settings
  // Expected: Authorization error (only owners can update settings)
  await TestValidator.error(
    "non-owner should not be able to update settings",
    async () => {
      await api.functional.hrmTracker.member.settings.updateSettings(
        managerConnection,
        {
          body: {
            name: "Updated Organization Name",
          } satisfies IHrmTrackerOrganization.ISettingsUpdate,
        },
      );
    },
  );
}
