import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformAdmin";
import type { IInvitationStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IInvitationStatistic";
import type { IInvitationStatisticByRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IInvitationStatisticByRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can retrieve invitation statistics when the organization has no invitations.
 * Validates that all count fields return zero and the by_role array is empty.
 */
export async function test_api_invitation_statistics_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformAdmin.IJoin,
  });
  // 2. Retrieve invitation statistics
  const statistics =
    await api.functional.hrmPlatform.admin.invitations.statistics(
      adminConnection,
    );
  typia.assert(statistics);
  // 3. Validate all count fields are zero
  TestValidator.equals("total_count is zero", statistics.total_count, 0);
  TestValidator.equals("pending_count is zero", statistics.pending_count, 0);
  TestValidator.equals("accepted_count is zero", statistics.accepted_count, 0);
  TestValidator.equals("expired_count is zero", statistics.expired_count, 0);
  TestValidator.equals("revoked_count is zero", statistics.revoked_count, 0);
  TestValidator.equals("trend_7_days is zero", statistics.trend_7_days, 0);
  TestValidator.equals("trend_14_days is zero", statistics.trend_14_days, 0);
  TestValidator.equals("trend_30_days is zero", statistics.trend_30_days, 0);
  // 4. Validate by_role array is empty
  TestValidator.equals("by_role array is empty", statistics.by_role.length, 0);
}
