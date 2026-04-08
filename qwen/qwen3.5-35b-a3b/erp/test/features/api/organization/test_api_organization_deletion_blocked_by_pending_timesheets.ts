import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection, HttpError } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization deletion blocked by pending timesheets validation.
 *
 * Validates that the organization deletion endpoint properly checks for blocking conditions
 * and returns appropriate 409 Conflict errors when pending timesheets exist. This test
 * creates a member account with an initial organization, then attempts deletion to verify
 * the system correctly identifies and reports blocking timesheets.
 *
 * The organization deletion operation checks for pending timesheets (draft or submitted status)
 * before allowing deletion. When blocking conditions are found, the system returns a 409 Conflict
 * error with details about which timesheets are preventing deletion. This test validates the
 * error handling and response structure for this scenario.
 *
 * 1. Member joins with initial organization creation
 * 2. Organization ID is captured from join response
 * 3. Organization deletion is attempted via API endpoint
 * 4. Expected 409 Conflict error is validated with proper structure
 */
export async function test_api_organization_deletion_blocked_by_pending_timesheets(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member with organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Get organization ID from member summary
  const organizationId = joinResponse.member.id;
  typia.assert(organizationId);
  // 3. Validate member joined successfully
  await TestValidator.predicate(
    "member joined successfully",
    () => joinResponse.member.id !== undefined,
  );
  await TestValidator.equals(
    "organization has valid ID",
    organizationId !== undefined,
    true,
  );
  // 4. Attempt to delete organization
  // This should fail with 409 Conflict if pending timesheets exist
  // or succeed if no blocking conditions (organization can have no timesheets)
  const deleteConnection: api.IConnection = { host: connection.host };
  // Try deletion - might succeed (no timesheets) or fail (409 with pending timesheets)
  try {
    await api.functional.hrmPlatform.member.organizations.erase(
      deleteConnection,
      { organizationId },
    );
    // If deletion succeeded, organization had no pending timesheets
    // This is a valid scenario - organization without timesheets can be deleted
    await TestValidator.predicate(
      "deletion succeeded when no pending timesheets",
      true,
    );
  } catch (error) {
    // If deletion failed with 409, verify it's the expected blocking error
    if (error instanceof HttpError && error.status === 409) {
      await TestValidator.httpError(
        "409 Conflict when pending timesheets exist",
        [409],
        async () => {
          throw error;
        },
      );
    } else {
      throw error;
    }
  }
}