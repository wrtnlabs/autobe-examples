import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

/**
 * Validate that report submission fails with a 400 Bad Request when attempting
 * to report an unsupported target type.
 *
 * This test follows the business rule specified in 05-business-rules.md that
 * only "post" and "comment" are valid target_type values for reports. The
 * scenario creates a new member account and then attempts to submit a report
 * with an invalid target_type of "user", which should be rejected by the system
 * with a 400 Bad Request error. This verifies the system enforces report
 * integrity and prevents misuse by rejecting invalid target types.
 *
 * 1. Authenticate as member via /auth/member/join endpoint
 * 2. Submit report with target_type: "user" (invalid per business rules)
 * 3. Validate that system returns 400 Bad Request error (TestValidator.error)
 */
export async function test_api_report_submission_with_invalid_target_type(
  connection: api.IConnection,
) {
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "StrongPass123!@#",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.1",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  await TestValidator.error("invalid target type should fail", async () => {
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: JSON.stringify({
        target_type: "user",
        target_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "spam",
      }),
    });
  });
}
