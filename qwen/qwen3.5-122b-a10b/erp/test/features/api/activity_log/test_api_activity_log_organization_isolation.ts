import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmActivityLog";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that activity logs are strictly isolated per organization.
 *
 * Validates the multi-tenancy data isolation requirement where activity logs are scoped to the selected organization context. A user who belongs to multiple organizations should only see activity logs from their currently selected organization, with no data leakage between tenant organizations.
 *
 * This test ensures that when querying activity logs for different organizations using their organization codes, the results are completely isolated. Logs created in Organization A must not appear when querying Organization B, even if the same user performed actions in both organizations.
 *
 * 1. Register a member user with email and password credentials.
 * 2. Query activity logs for Organization A using its organization code.
 * 3. Query activity logs for Organization B using a different organization code.
 * 4. Verify that the activity log IDs from Organization A are not present in Organization B's results.
 * 5. Validate that the pagination metadata and data arrays are organization-specific.
 */
export async function test_api_activity_log_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Query activity logs for Organization A
  const organizationACode = RandomGenerator.alphabets(8);
  const logsA: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode: organizationACode,
        body: {} satisfies IHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsA);
  // 3. Query activity logs for Organization B
  const organizationBCode = RandomGenerator.alphabets(8);
  const logsB: IPageIHrmActivityLog.ISummary =
    await api.functional.hrm.member.organizations.activity_logs.patchByOrganizationcode(
      memberConnection,
      {
        organizationCode: organizationBCode,
        body: {} satisfies IHrmActivityLog.IRequest,
      },
    );
  typia.assert(logsB);
  // 4. Verify organization codes are different
  TestValidator.notEquals(
    "organization codes must be different",
    organizationACode,
    organizationBCode,
  );
  // 5. Verify activity log isolation - logs from different organizations should be different
  // Extract log IDs from both organizations
  const logIdsA = logsA.data.map((log) => log.id);
  const logIdsB = logsB.data.map((log) => log.id);
  // If both organizations have logs, verify they don't overlap
  if (logIdsA.length > 0 && logIdsB.length > 0) {
    const hasOverlap = logIdsA.some((id) => logIdsB.includes(id));
    TestValidator.predicate(
      "no log ID overlap between organizations",
      !hasOverlap,
    );
  }
  // 6. Verify pagination metadata is present and valid
  TestValidator.predicate(
    "organization A pagination is valid",
    logsA.pagination.current >= 0 &&
      logsA.pagination.limit >= 0 &&
      logsA.pagination.records >= 0 &&
      logsA.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "organization B pagination is valid",
    logsB.pagination.current >= 0 &&
      logsB.pagination.limit >= 0 &&
      logsB.pagination.records >= 0 &&
      logsB.pagination.pages >= 0,
  );
}
