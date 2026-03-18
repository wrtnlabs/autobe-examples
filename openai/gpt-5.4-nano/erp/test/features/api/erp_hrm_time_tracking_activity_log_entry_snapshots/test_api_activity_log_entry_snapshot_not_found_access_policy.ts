import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_snapshot_not_found_access_policy(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member in an organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = `${RandomGenerator.alphabets(10)}.${RandomGenerator.alphabets(6)}@example.com`;
  const join = {
    email: memberEmail satisfies string & tags.Format<"email">,
    password: memberPassword,
    organizationName: `${RandomGenerator.alphabets(10)} org`,
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: join });
  // 2) Use a well-formed UUID that does not correspond to any existing snapshot
  const missingId = typia.random<string & tags.Format<"uuid">>();
  // 3) Access policy: should be rejected with not-found or access-denied
  await TestValidator.httpError(
    "should reject when activity log entry snapshot does not exist",
    [403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.at(
        memberConnection,
        {
          activityLogEntrySnapshotId: missingId,
        },
      );
    },
  );
}
