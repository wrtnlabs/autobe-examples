import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_retrieve_cross_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionA: api.IConnection = { host: connection.host };
  const memberConnectionB: api.IConnection = { host: connection.host };
  const joinedA = await authorize_member_join(memberConnectionA, {
    body: {
      email:
        `member-a-${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string,
      password: `Pw-${RandomGenerator.alphaNumeric(12)}!` satisfies string,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://example.com/onboarding/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joinedA);
  const joinedB = await authorize_member_join(memberConnectionB, {
    body: {
      email:
        `member-b-${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string,
      password: `Pw-${RandomGenerator.alphaNumeric(12)}!` satisfies string,
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: `https://example.com/onboarding/${RandomGenerator.alphaNumeric(8)}`,
      referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(joinedB);
  await TestValidator.httpError(
    "retrieving a timelog with an unknown id in the active organization should fail",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timelogs.at(memberConnectionA, {
        timelogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  await TestValidator.httpError(
    "switching to another member context should not expose unrelated timelogs",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timelogs.at(memberConnectionB, {
        timelogId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
