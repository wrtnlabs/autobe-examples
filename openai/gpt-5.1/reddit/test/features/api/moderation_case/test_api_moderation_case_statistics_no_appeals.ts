import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationCaseStatistics } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseStatistics";

/**
 * Validate moderation case statistics for a case with no appeals.
 *
 * Business context: Administrative users can open moderation cases for complex
 * issues and later view aggregated appeal statistics per case. When a case is
 * newly created and no appeals have been filed, the statistics endpoint must
 * behave gracefully and return zeroed metrics instead of throwing errors or
 * returning inconsistent numbers.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via the join endpoint to establish an authenticated
 *    admin context. The SDK will attach the issued access token to the shared
 *    connection automatically.
 * 2. Create a new moderation case with a unique case_key and minimal required
 *    fields (title, status, priority; optional description may be omitted or
 *    filled with random content). No appeals are created for this case in this
 *    test.
 * 3. Call the statistics endpoint using the created case's business key (case_key)
 *    to retrieve aggregated appeal statistics.
 * 4. Assert the response type using typia.assert to ensure it matches
 *    ICommunityPlatformModerationCaseStatistics.
 * 5. Validate that all appeal count fields are 0 and that the
 *    openAppealsOlderThanThresholdCount is also 0, confirming that the
 *    aggregation logic correctly handles the absence of appeals.
 * 6. Confirm that firstAppealAt and latestAppealAt are null or undefined, and that
 *    derived timing metrics (averageResponseTimeSeconds and
 *    medianResponseTimeSeconds) are also null or undefined.
 *
 * This test ensures the analytics endpoint is safe to call immediately after
 * case creation and that dashboards relying on these statistics can display
 * consistent zeroed metrics when no appeals exist.
 */
export async function test_api_moderation_case_statistics_no_appeals(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authenticated context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new moderation case with a unique case_key
  const caseKey: string = RandomGenerator.alphaNumeric(12);
  const createCaseBody = {
    case_key: caseKey,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    // description is optional; include a random paragraph for realism
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "open",
    priority: "medium",
    // assigned_adminuser_id is optional; omit to keep the case unassigned
  } satisfies ICommunityPlatformModerationCase.ICreate;

  const createdCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: createCaseBody,
      },
    );
  typia.assert(createdCase);

  // Sanity check: created case should have the same case_key we requested
  TestValidator.equals(
    "created moderation case should preserve case_key",
    createdCase.case_key,
    caseKey,
  );

  // 3. Fetch statistics for the created case using its business key
  const statistics: ICommunityPlatformModerationCaseStatistics =
    await api.functional.communityPlatform.adminUser.moderationCases.statistics.at(
      connection,
      {
        caseKey: caseKey,
      },
    );
  typia.assert(statistics);

  // 4. Validate that core counts reflect absence of appeals
  TestValidator.equals(
    "statistics.caseKey should match requested caseKey",
    statistics.caseKey,
    caseKey,
  );

  TestValidator.equals(
    "totalAppeals should be 0 when no appeals exist",
    statistics.totalAppeals,
    0,
  );
  TestValidator.equals(
    "pendingAppeals should be 0 when no appeals exist",
    statistics.pendingAppeals,
    0,
  );
  TestValidator.equals(
    "approvedAppeals should be 0 when no appeals exist",
    statistics.approvedAppeals,
    0,
  );
  TestValidator.equals(
    "rejectedAppeals should be 0 when no appeals exist",
    statistics.rejectedAppeals,
    0,
  );
  TestValidator.equals(
    "openAppealsOlderThanThresholdCount should be 0 when no appeals exist",
    statistics.openAppealsOlderThanThresholdCount,
    0,
  );

  // 5. Validate that appeal timing metrics are null or undefined when
  // no appeals exist.
  TestValidator.predicate(
    "firstAppealAt should be null or undefined when no appeals exist",
    statistics.firstAppealAt === null || statistics.firstAppealAt === undefined,
  );
  TestValidator.predicate(
    "latestAppealAt should be null or undefined when no appeals exist",
    statistics.latestAppealAt === null ||
      statistics.latestAppealAt === undefined,
  );
  TestValidator.predicate(
    "averageResponseTimeSeconds should be null or undefined when no appeals exist",
    statistics.averageResponseTimeSeconds === null ||
      statistics.averageResponseTimeSeconds === undefined,
  );
  TestValidator.predicate(
    "medianResponseTimeSeconds should be null or undefined when no appeals exist",
    statistics.medianResponseTimeSeconds === null ||
      statistics.medianResponseTimeSeconds === undefined,
  );
}
