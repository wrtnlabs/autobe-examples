import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timesheet_versioning_lock_erase_success_and_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1/2/3 require creation of a real timesheet versioning lock and
  // timelog workflow assertions, but no lock/timelog creation or retrieval
  // endpoints are available in the provided API surface.
  //
  // To keep the test deterministic and compilation-safe with available
  // utilities, we authenticate multiple members and validate that the DELETE
  // endpoint rejects unknown lockIds (which is the only enforceable behavior
  // without lock creation).
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2,
      href: "https://example.com/join-b",
      referrer: "https://example.com/referrer-b",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const unknownLockId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "erase unknown lock id should be rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
        memberAConnection,
        { lockId: unknownLockId },
      );
    },
  );
  await TestValidator.error(
    "erase unknown lock id should be rejected for other member",
    async () => {
      await api.functional.erpHrmTimeTracking.member.timesheetVersioningLocks.erase(
        memberBConnection,
        { lockId: unknownLockId },
      );
    },
  );
}
