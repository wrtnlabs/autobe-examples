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
 * Test that an authenticated admin can retrieve comprehensive invitation statistics for their organization.
 * Verifies response includes all required fields: total_count, pending_count, accepted_count,
 * expired_count, revoked_count, trend_7_days, trend_14_days, trend_30_days, and by_role array.
 */
export async function test_api_invitation_statistics_retrieve_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
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
  // 3. Validate total count is non-negative
  TestValidator.predicate(
    "total_count is non-negative",
    statistics.total_count >= 0,
  );
  // 4. Validate all status counts are non-negative
  TestValidator.predicate(
    "pending_count is non-negative",
    statistics.pending_count >= 0,
  );
  TestValidator.predicate(
    "accepted_count is non-negative",
    statistics.accepted_count >= 0,
  );
  TestValidator.predicate(
    "expired_count is non-negative",
    statistics.expired_count >= 0,
  );
  TestValidator.predicate(
    "revoked_count is non-negative",
    statistics.revoked_count >= 0,
  );
  // 5. Validate trend counts are non-negative
  TestValidator.predicate(
    "trend_7_days is non-negative",
    statistics.trend_7_days >= 0,
  );
  TestValidator.predicate(
    "trend_14_days is non-negative",
    statistics.trend_14_days >= 0,
  );
  TestValidator.predicate(
    "trend_30_days is non-negative",
    statistics.trend_30_days >= 0,
  );
  // 6. Validate trend consistency (30 days >= 14 days >= 7 days)
  TestValidator.predicate(
    "trend_30_days >= trend_14_days",
    statistics.trend_30_days >= statistics.trend_14_days,
  );
  TestValidator.predicate(
    "trend_14_days >= trend_7_days",
    statistics.trend_14_days >= statistics.trend_7_days,
  );
  // 7. Validate by_role array structure
  await ArrayUtil.asyncForEach(statistics.by_role, async (roleStat) => {
    typia.assert(roleStat);
    TestValidator.predicate(
      "role_id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        roleStat.role_id,
      ),
    );
    TestValidator.predicate(
      "role_name is not empty",
      roleStat.role_name.length > 0,
    );
    TestValidator.predicate(
      "invitation_count is non-negative",
      roleStat.invitation_count >= 0,
    );
  });
  // 8. Validate total_count consistency with status counts
  const statusSum =
    statistics.pending_count +
    statistics.accepted_count +
    statistics.expired_count +
    statistics.revoked_count;
  TestValidator.predicate(
    "total_count >= sum of status counts",
    statistics.total_count >= statusSum,
  );
}
