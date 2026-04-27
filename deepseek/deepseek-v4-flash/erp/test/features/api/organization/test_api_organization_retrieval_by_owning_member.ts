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

export async function test_api_organization_retrieval_by_owning_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member via authorize_member_join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: "owner@test.com",
      password: "Password123!",
      display_name: "Alice",
      href: "https://example.com/register",
      referrer: "https://example.com/",
    },
  });
  typia.assert(member);
  // 2. Create an organization via generate_random utility
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "TechFlow Solutions",
          description: "A modern software development company",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Retrieve the organization by its UUID
  const retrieved =
    await api.functional.hrmTimeTracking.member.organizations.at(
      memberConnection,
      {
        organizationId: organization.id,
      },
    );
  typia.assert(retrieved);
  // 4. Validate response fields match expected values
  TestValidator.equals("organization id", retrieved.id, organization.id);
  TestValidator.equals(
    "organization name",
    retrieved.name,
    "TechFlow Solutions",
  );
  TestValidator.equals(
    "organization description",
    retrieved.description,
    "A modern software development company",
  );
  TestValidator.equals("organization currency", retrieved.currency, "USD");
  TestValidator.equals(
    "organization timezone",
    retrieved.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "organization fiscal_start_month",
    retrieved.fiscal_start_month,
    1,
  );
  TestValidator.equals("organization status", retrieved.status, "active");
  // 5. Validate owner fields match the registered member
  TestValidator.equals("owner id", retrieved.owner.id, member.id);
  TestValidator.equals("owner email", retrieved.owner.email, "owner@test.com");
  TestValidator.equals(
    "owner display_name",
    retrieved.owner.display_name,
    "Alice",
  );
  TestValidator.equals("owner avatar", retrieved.owner.avatar, null);
  TestValidator.equals(
    "owner phone_number",
    retrieved.owner.phone_number,
    null,
  );
  TestValidator.equals("owner deleted_at", retrieved.owner.deleted_at, null);
  // 6. Validate timestamps are present
  TestValidator.predicate("created_at is valid ISO date", () => {
    const date = new Date(retrieved.created_at);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updated_at is valid ISO date", () => {
    const date = new Date(retrieved.updated_at);
    return !isNaN(date.getTime());
  });
}
