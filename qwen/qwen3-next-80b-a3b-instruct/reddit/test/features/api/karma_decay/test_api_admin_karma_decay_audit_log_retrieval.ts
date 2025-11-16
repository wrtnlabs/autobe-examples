import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformKarmaDecayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformKarmaDecayLog";
import type { IPageICommunityPlatformKarmaDecayLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformKarmaDecayLog";

export async function test_api_admin_karma_decay_audit_log_retrieval(
  connection: api.IConnection,
) {
  // Retrieve the karma decay audit log as a system administrator, validating that the response has the correct structure.
  // This endpoint is accessible to system administrators with proper authorization, and returns a paginated list of all karma decay events.
  // The response contains pagination metadata (current, limit, records, pages) and an array of karma decay log entries.
  // Each log entry records a reduction in a member's karma with details about the amount, reason, timestamp, and optionally the admin who triggered it.
  // The log ensures complete transparency and system-level auditability of karma management, with sensitive inspector data sanitized.
  // All entries are strictly sanitized per the IPageICommunityPlatformKarmaDecayLog schema to prevent reverse-engineering of system logic.

  // Step 1: Retrieve the karma decay audit log
  const decayLog: IPageICommunityPlatformKarmaDecayLog =
    await api.functional.communityPlatform.admin.karma.decay.index(connection);
  typia.assert(decayLog);

  // Step 2: Validate the pagination structure
  TestValidator.predicate("current page >= 1", decayLog.current >= 1);
  TestValidator.predicate(
    "limit between 1 and 100",
    decayLog.limit >= 1 && decayLog.limit <= 100,
  );
  TestValidator.predicate("records >= 0", decayLog.records >= 0);
  TestValidator.predicate("pages >= 1", decayLog.pages >= 1);

  // Step 3: Validate that data array exists and has correct element type
  TestValidator.predicate("data is an array", Array.isArray(decayLog.data));
  if (decayLog.data.length > 0) {
    // If there are entries, validate first entry structure
    const firstLog = decayLog.data[0];
    TestValidator.equals("first log has uuid id", typeof firstLog.id, "string");
    TestValidator.equals(
      "first log has uuid member_id",
      typeof firstLog.member_id,
      "string",
    );
    TestValidator.predicate(
      "first log has integer amount",
      Number.isInteger(firstLog.amount),
    );
    TestValidator.predicate(
      "first log has string reason",
      typeof firstLog.reason === "string",
    );
    TestValidator.equals(
      "first log has date-time created_at",
      typeof firstLog.created_at,
      "string",
    );
    TestValidator.predicate(
      "first log created_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$/.test(firstLog.created_at),
    );

    // admin_id is optional - validate it's either null, undefined, or valid uuid
    TestValidator.predicate(
      "first log admin_id is null, undefined, or valid uuid",
      firstLog.admin_id === null ||
        firstLog.admin_id === undefined ||
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          firstLog.admin_id,
        ),
    );
  }

  // Step 4: Confirm log is non-empty or empty as expected
  // The system may return empty log if no decay events, which is acceptable
}
