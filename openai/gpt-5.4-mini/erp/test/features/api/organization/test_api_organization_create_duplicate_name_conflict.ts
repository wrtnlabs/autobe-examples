import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
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

export async function test_api_organization_create_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organizationName = `dup-${RandomGenerator.alphaNumeric(12)}`;
  const firstCreated =
    await api.functional.hrmTimeTracking.member.organizations.create(
      memberConnection,
      {
        body: {
          name: organizationName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          logoImageUrl: null,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(firstCreated);
  TestValidator.equals(
    "organization name should match the requested name",
    firstCreated.name,
    organizationName,
  );
  TestValidator.equals(
    "organization description should match the requested description",
    firstCreated.description,
    firstCreated.description,
  );
  TestValidator.equals(
    "organization currency should match the requested currency",
    firstCreated.currency,
    "USD",
  );
  TestValidator.equals(
    "organization timezone should match the requested timezone",
    firstCreated.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "organization fiscal start month should match the requested month",
    firstCreated.fiscalStartMonth,
    1,
  );
  TestValidator.equals(
    "organization should be active after creation",
    firstCreated.deletedAt,
    null,
  );
  await TestValidator.httpError(
    "duplicate organization name should be rejected with a conflict",
    [409],
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.create(
        memberConnection,
        {
          body: {
            name: organizationName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            logoImageUrl: null,
            currency: "USD",
            timezone: "Asia/Seoul",
            fiscalStartMonth: 2,
          } satisfies IHrmTimeTrackingOrganization.ICreate,
        },
      );
    },
  );
}
