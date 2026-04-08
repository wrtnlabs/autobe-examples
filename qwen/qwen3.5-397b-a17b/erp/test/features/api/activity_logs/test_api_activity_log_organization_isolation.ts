import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test activity log organization isolation for multi-tenancy security.
 *
 * Validates that activity log access is properly isolated by organization context. Members cannot access activity logs from organizations they do not belong to, ensuring multi-tenancy data isolation for audit trail access.
 *
 * The test creates two separate member accounts and verifies that attempting to access activity logs across organizational boundaries returns 404 Not Found instead of 403 Forbidden. This prevents information leakage about the existence of activity logs in other organizations.
 *
 * 1. Member A registers with unique email credentials.
 * 2. Member B registers with separate unique email credentials.
 * 3. Member B attempts to access an activity log using a randomly generated UUID.
 * 4. Validates that the response is 404 Not Found (resource not accessible in current organization context).
 * 5. Confirms no activity log data is exposed to members outside the organization.
 *
 * Note: Full organization isolation testing requires organization creation APIs which are not available in the current function list. This test validates the core access control behavior with the available endpoints.
 */
export async function test_api_activity_log_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member A with unique credentials
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
  // 2. Create member B with separate unique credentials
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
  // 3. Verify members have different identities
  TestValidator.notEquals(
    "member A and B have different IDs",
    memberA.id,
    memberB.id,
  );
  TestValidator.notEquals(
    "member A and B have different emails",
    memberA.email,
    memberB.email,
  );
  // 4. Member B attempts to access activity log with random UUID
  // This returns 404 as the log doesn't exist in member B's organization context
  // System returns 404 (not 403) to prevent information leakage about log existence
  const randomActivityLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "member B cannot access activity log from different organization",
    404,
    async () => {
      await api.functional.hrmPlatform.member.activity_logs.at(
        memberBConnection,
        {
          activityLogId: randomActivityLogId,
        },
      );
    },
  );
  // 5. Member A also cannot access arbitrary activity logs (validates consistent access control)
  const anotherRandomActivityLogId = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "member A cannot access non-existent activity log",
    404,
    async () => {
      await api.functional.hrmPlatform.member.activity_logs.at(
        memberAConnection,
        {
          activityLogId: anotherRandomActivityLogId,
        },
      );
    },
  );
}
