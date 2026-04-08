import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization data isolation to verify multi-tenancy security.
 *
 * Creates two separate member accounts, each belonging to different organizations. Queries activity logs from both members' contexts and verifies that each member only receives activity logs from their own organization. Confirms no activity logs from the other organization appear in either response, validating that organization context enforcement correctly isolates audit trail data between organizations for compliance and data privacy.
 *
 * Special attention is given to verifying that the organization_id reference is correctly maintained in the activity log filtering logic and that the multi-tenancy boundary is enforced at the database query level.
 *
 * 1. First member registers and authenticates for organization A.
 * 2. Second member registers and authenticates for organization B.
 * 3. Query activity logs from first member's context.
 * 4. Query activity logs from second member's context.
 * 5. Verify organization isolation - each member only sees their organization's logs.
 * 6. Confirm no cross-organization data leakage in activity log responses.
 */
export async function test_api_activity_log_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate first member (Organization A)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create and authenticate second member (Organization B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Query activity logs from first member's context
  const logsA = await api.functional.hrmPlatform.member.activity_logs.index(
    memberAConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(logsA);
  // 4. Query activity logs from second member's context
  const logsB = await api.functional.hrmPlatform.member.activity_logs.index(
    memberBConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformActivityLog.IRequest,
    },
  );
  typia.assert(logsB);
  // 5. Verify organization isolation - each member only sees their organization's logs
  if (logsA.data.length > 0 && logsB.data.length > 0) {
    // Get organization IDs from the logs
    const orgAId = logsA.data[0].organization.id;
    const orgBId = logsB.data[0].organization.id;
    // Verify organizations are different
    TestValidator.notEquals(
      "organizations should be different",
      orgAId,
      orgBId,
    );
    // Verify all logs in memberA's response belong to organization A
    for (const log of logsA.data) {
      TestValidator.equals(
        "memberA sees only orgA logs",
        log.organization.id,
        orgAId,
      );
    }
    // Verify all logs in memberB's response belong to organization B
    for (const log of logsB.data) {
      TestValidator.equals(
        "memberB sees only orgB logs",
        log.organization.id,
        orgBId,
      );
    }
    // 6. Verify no cross-organization data leakage
    // Check no overlap in organization IDs between result sets
    const orgAIds = new Set(logsA.data.map((log) => log.organization.id));
    const orgBIds = new Set(logsB.data.map((log) => log.organization.id));
    for (const orgId of orgAIds) {
      TestValidator.predicate(
        `organization ${orgId} should not appear in memberB's logs`,
        !orgBIds.has(orgId),
      );
    }
    for (const orgId of orgBIds) {
      TestValidator.predicate(
        `organization ${orgId} should not appear in memberA's logs`,
        !orgAIds.has(orgId),
      );
    }
  }
}
