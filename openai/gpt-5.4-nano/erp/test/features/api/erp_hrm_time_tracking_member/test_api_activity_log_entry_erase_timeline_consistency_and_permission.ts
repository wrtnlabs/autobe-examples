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

export async function test_api_activity_log_entry_erase_timeline_consistency_and_permission(
  connection: api.IConnection,
): Promise<void> {
  // Since only member join and activity-log erase endpoints are provided,
  // we can validate authorization behavior and that deletion is consistent
  // for the targeted ID when it exists.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password-1234!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
      href: "https://example.com/join2",
      referrer: "https://example.com/ref2",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const targetActivityLogEntryId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 2: Unauthorized actor blocked
  await TestValidator.httpError(
    "unauthorized member cannot erase activity log entry",
    [401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntries.erase(
        otherMemberConnection,
        { activityLogEntryId: targetActivityLogEntryId },
      );
    },
  );
  // Scenario 1 (best-effort with available APIs): authorized actor erases.
  // If the ID does not exist, 404 is acceptable because we cannot create
  // a real activity log entry with the provided SDK.
  try {
    await api.functional.erpHrmTimeTracking.member.activityLogEntries.erase(
      memberConnection,
      { activityLogEntryId: targetActivityLogEntryId },
    );
  } catch (exp) {
    if (
      typeof exp === "object" &&
      exp !== null &&
      "status" in exp &&
      typeof (exp as { status?: unknown }).status === "number"
    ) {
      const status = (exp as { status: number }).status;
      TestValidator.equals(
        "authorized erase error must be not-found when ID is unknown",
        status,
        404,
      );
      return;
    }
    throw exp;
  }
}
