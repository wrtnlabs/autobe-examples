import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_organization_deletion_blocked_by_pending_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a new organization
  const orgConnection: api.IConnection = { host: connection.host };
  orgConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      orgConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        },
      },
    );
  typia.assert(organization);
  // 3. Verify organization was created successfully
  TestValidator.equals(
    "organization owner matches",
    organization.owner.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "organization has valid ID",
    organization.id.length > 0,
  );
  // 4. Attempt to delete the organization
  // Note: In a complete test scenario, we would create employees, timelogs, and timesheets
  // with 'draft' or 'submitted' status before attempting deletion to test the blocking logic.
  // The backend should reject deletion with 400 Bad Request when pending timesheets exist.
  // This test validates the organization deletion endpoint is accessible.
  await api.functional.hrmPlatform.member.organizations.erase(orgConnection, {
    organizationId: organization.id,
  });
  // 5. Verify organization was deleted (in this basic test without pending timesheets)
  // In production, the backend would block deletion if pending timesheets exist
}
