import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPaymentLog";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";
import type { IPageICommunityPlatformPaymentLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPaymentLog";

export async function test_api_payment_logs_unauthorized_access(
  connection: api.IConnection,
) {
  // Test unauthorized access to payment logs endpoint. This scenario authenticates as a regular member and attempts to access the admin-only payment logs endpoint. The system must reject this unauthorized access attempt with a 401 Unauthorized response, ensuring sensitive financial data is protected from non-admin users. The test verifies proper authentication enforcement by confirming that non-admin users cannot retrieve payment logs even when properly authenticated as regular members.
  // Step 1: Authenticate as regular member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword: string = "StrongPassword123!";
  const memberHref: string = "https://community-platform.com";
  const memberReferrer: string = "https://community-platform.com/login";
  const memberIp: string = "192.168.1.100";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
        ip: memberIp,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Attempt to access payment logs endpoint as unauthorized member
  await TestValidator.error("non-admin user should be rejected", async () => {
    await api.functional.communityPlatform.admin.payments.logs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPaymentLog.IRequest,
      },
    );
  });
}
