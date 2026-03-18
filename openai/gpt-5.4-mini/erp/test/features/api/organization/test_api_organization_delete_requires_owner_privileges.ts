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

export async function test_api_organization_delete_requires_owner_privileges(
  connection: api.IConnection,
): Promise<void> {
  const ownerJoinConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(owner);
  const ownerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: owner.token.access },
  };
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscalStartMonth: 1,
        } satisfies IHrmTimeTrackingOrganization.ICreate,
      },
    );
  typia.assert(organization);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(member);
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  await TestValidator.httpError(
    "non-owner member cannot delete another organization's record",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.erase(
        memberConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
  await api.functional.hrmTimeTracking.member.organizations.erase(
    ownerConnection,
    {
      organizationId: organization.id,
    },
  );
  await TestValidator.httpError(
    "deleted organization should no longer be accessible",
    [404, 410],
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.erase(
        ownerConnection,
        {
          organizationId: organization.id,
        },
      );
    },
  );
}
