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

export async function test_api_organization_update_cross_context_denied(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const organizationA =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationA);
  const organizationB =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: `${RandomGenerator.name()} ${RandomGenerator.alphabets(4)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 4,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organizationB);
  const organizationSnapshot = {
    id: organizationB.id,
    name: organizationB.name,
    description: organizationB.description,
    logoImageUrl: organizationB.logoImageUrl,
    currency: organizationB.currency,
    timezone: organizationB.timezone,
    fiscalStartMonth: organizationB.fiscalStartMonth,
    createdAt: organizationB.createdAt,
    updatedAt: organizationB.updatedAt,
    deletedAt: organizationB.deletedAt,
  } satisfies IHrmTimeTrackingOrganization;
  const updateBody = {
    name: `${organizationB.name} updated`,
    description: null,
    currency: "EUR",
    timezone: "UTC",
    fiscalStartMonth: 6,
  } satisfies IHrmTimeTrackingOrganization.IUpdate;
  await TestValidator.httpError(
    "cross-context organization update should be denied",
    [403, 404],
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.update(
        memberConnection,
        {
          organizationId: organizationB.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "target organization id should remain unchanged",
    organizationB.id,
    organizationSnapshot.id,
  );
  TestValidator.equals(
    "target organization name should remain unchanged",
    organizationB.name,
    organizationSnapshot.name,
  );
  TestValidator.equals(
    "target organization description should remain unchanged",
    organizationB.description,
    organizationSnapshot.description,
  );
  TestValidator.equals(
    "target organization logo should remain unchanged",
    organizationB.logoImageUrl,
    organizationSnapshot.logoImageUrl,
  );
  TestValidator.equals(
    "target organization currency should remain unchanged",
    organizationB.currency,
    organizationSnapshot.currency,
  );
  TestValidator.equals(
    "target organization timezone should remain unchanged",
    organizationB.timezone,
    organizationSnapshot.timezone,
  );
  TestValidator.equals(
    "target organization fiscal month should remain unchanged",
    organizationB.fiscalStartMonth,
    organizationSnapshot.fiscalStartMonth,
  );
  TestValidator.equals(
    "target organization createdAt should remain unchanged",
    organizationB.createdAt,
    organizationSnapshot.createdAt,
  );
  TestValidator.equals(
    "target organization updatedAt should remain unchanged",
    organizationB.updatedAt,
    organizationSnapshot.updatedAt,
  );
  TestValidator.equals(
    "target organization deletedAt should remain unchanged",
    organizationB.deletedAt,
    organizationSnapshot.deletedAt,
  );
}
