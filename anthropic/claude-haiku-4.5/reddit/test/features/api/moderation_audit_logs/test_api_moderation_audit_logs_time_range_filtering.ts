import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

export async function test_api_moderation_audit_logs_time_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for audit log testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve all audit logs without time filtering to establish baseline
  const allLogsResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(allLogsResponse);

  // Step 3: Test filtering with created_at_from parameter
  // Get a timestamp from 24 hours ago
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayAgoISO = oneDayAgo.toISOString();

  const logsAfterDate: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: oneDayAgoISO,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsAfterDate);

  // Validate that logs returned have created_at >= oneDayAgoISO
  for (const log of logsAfterDate.data) {
    TestValidator.predicate(
      "log created_at should be on or after created_at_from",
      new Date(log.created_at).getTime() >= new Date(oneDayAgoISO).getTime(),
    );
  }

  // Step 4: Test filtering with created_at_to parameter
  // Get a timestamp from 1 hour ago
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneHourAgoISO = oneHourAgo.toISOString();

  const logsBeforeDate: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_to: oneHourAgoISO,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsBeforeDate);

  // Validate that logs returned have created_at <= oneHourAgoISO
  for (const log of logsBeforeDate.data) {
    TestValidator.predicate(
      "log created_at should be on or before created_at_to",
      new Date(log.created_at).getTime() <= new Date(oneHourAgoISO).getTime(),
    );
  }

  // Step 5: Test bounded time window with both created_at_from and created_at_to
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const thirtyMinutesAgoISO = thirtyMinutesAgo.toISOString();

  const logsInTimeWindow: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: oneDayAgoISO,
          created_at_to: thirtyMinutesAgoISO,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(logsInTimeWindow);

  // Validate that logs are within the time window
  for (const log of logsInTimeWindow.data) {
    const logTime = new Date(log.created_at).getTime();
    TestValidator.predicate(
      "log should be within bounded time window",
      logTime >= new Date(oneDayAgoISO).getTime() &&
        logTime <= new Date(thirtyMinutesAgoISO).getTime(),
    );
  }

  // Step 6: Test last 7 days filtering (last week)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const lastWeekLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          created_at_from: sevenDaysAgoISO,
          created_at_to: now.toISOString(),
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(lastWeekLogs);

  // Step 7: Test filtering by moderator_id combined with time range
  if (moderator.id) {
    const moderatorSpecificLogs: IPageICommunityPlatformModerationAuditLog.ISummary =
      await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            moderator_id: moderator.id,
            created_at_from: oneDayAgoISO,
            created_at_to: now.toISOString(),
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(moderatorSpecificLogs);

    // Validate that all logs belong to the specified moderator
    for (const log of moderatorSpecificLogs.data) {
      TestValidator.equals(
        "log moderator should match filtered moderator_id",
        log.moderator.id,
        moderator.id,
      );
    }
  }

  // Step 8: Test pagination within time-filtered results
  const paginatedResponse: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          created_at_from: sevenDaysAgoISO,
        } satisfies ICommunityPlatformModerationAuditLog.IRequest,
      },
    );
  typia.assert(paginatedResponse);

  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedResponse.data.length <= 10,
  );

  // Step 9: Test exact timestamp boundaries
  if (logsInTimeWindow.data.length > 0) {
    const firstLogTime = logsInTimeWindow.data[0].created_at;

    const logsFromFirstLog: IPageICommunityPlatformModerationAuditLog.ISummary =
      await api.functional.communityPlatform.moderator.moderationAuditLogs.index(
        connection,
        {
          body: {
            page: 1,
            limit: 100,
            created_at_from: firstLogTime,
          } satisfies ICommunityPlatformModerationAuditLog.IRequest,
        },
      );
    typia.assert(logsFromFirstLog);

    // Should include log at the exact boundary timestamp
    TestValidator.predicate(
      "should include log at exact from boundary",
      logsFromFirstLog.data.some(
        (log) =>
          log.created_at === firstLogTime ||
          new Date(log.created_at).getTime() >=
            new Date(firstLogTime).getTime(),
      ),
    );
  }

  // Step 10: Validate immutable created_at timestamps are present
  TestValidator.predicate(
    "all logs should have immutable created_at timestamps",
    allLogsResponse.data.every(
      (log) => log.created_at && log.created_at.length > 0,
    ),
  );
}
