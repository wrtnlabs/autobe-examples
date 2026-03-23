import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerAnalytic";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerAnalytic";
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

export async function test_api_employee_statistics_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration (join system)
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
  // 2. Create organization
  const org = await api.functional.hrmTracker.member.organizations.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        logo_image_uri: null,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: (typia.random<number>() satisfies number as number & tags.Minimum<1> & tags.Maximum<12>),
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  typia.assert(org);
  // 3. Create invited member and join organization
  const invitedConnection: api.IConnection = { host: connection.host };
  const invitedMember = await authorize_member_join(invitedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      phone: null,
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(invitedMember);
  // Join organization (this creates employee record)
  await api.functional.hrmTracker.member.organizations.create(
    invitedConnection,
    {
      body: {
        name: RandomGenerator.name(3) + "_org",
        description: RandomGenerator.paragraph({ sentences: 1 }),
        logo_image_uri: null,
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 1,
      } satisfies IHrmTrackerOrganization.ICreate,
    },
  );
  // 4. Retrieve employee statistics without filters
  const statistics =
    await api.functional.hrmTracker.member.organizations.analytics.employees.index(
      memberConnection,
      {
        organizationId: org.id,
        body: {},
      },
    );
  typia.assert(statistics);
  // 5. Validate response structure
  TestValidator.predicate(
    "has pagination",
    statistics.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(statistics.data));
  TestValidator.predicate(
    "pagination records matches data length",
    statistics.pagination.records === statistics.data.length,
  );
}