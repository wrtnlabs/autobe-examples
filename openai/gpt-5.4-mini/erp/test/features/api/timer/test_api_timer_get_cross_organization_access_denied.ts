import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_get_cross_organization_access_denied(
  connection: api.IConnection,
): Promise<void> {
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email:
        `member1-${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "password123" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "http://localhost" satisfies string & tags.Format<"uri">,
      referrer: "http://localhost" satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email:
        `member2-${RandomGenerator.alphaNumeric(8)}@example.com` satisfies string &
          tags.Format<"email">,
      password: "password123" satisfies string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "http://localhost" satisfies string & tags.Format<"uri">,
      referrer: "http://localhost" satisfies string & tags.Format<"uri">,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member2);
  const timerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member 1 must not access an unrelated timer",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timers.getByTimerid(
        member1Connection,
        {
          timerId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "member 2 must not access an unrelated timer from another context",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTime.member.timers.getByTimerid(
        member2Connection,
        {
          timerId,
        },
      );
    },
  );
}
