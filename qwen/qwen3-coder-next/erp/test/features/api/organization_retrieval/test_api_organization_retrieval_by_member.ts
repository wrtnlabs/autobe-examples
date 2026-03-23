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

export async function test_api_organization_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member);
  // Update connection with auth token from member registration
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // 2. Create organization
  const organization =
    await generate_random_hrm_tracker_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTrackerOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Retrieve organization details
  const retrieved = await api.functional.hrmTracker.member.organizations.at(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate organization fields
  TestValidator.equals(
    "organization name matches",
    retrieved.name,
    organization.name,
  );
  TestValidator.equals(
    "organization description matches",
    retrieved.description,
    organization.description,
  );
  TestValidator.equals(
    "organization currency matches",
    retrieved.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrieved.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month matches",
    retrieved.fiscal_start_month,
    organization.fiscal_start_month,
  );
  TestValidator.equals(
    "organization status is active",
    retrieved.status,
    "active",
  );
  TestValidator.predicate(
    "created_at exists",
    retrieved.created_at !== null && retrieved.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrieved.updated_at !== null && retrieved.updated_at !== undefined,
  );
}
