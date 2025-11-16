import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAuditLog";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAuditLog";

/**
 * Validate multi-dimensional filtering of moderation audit logs analytics for
 * platform admins.
 *
 * Business goal: Ensure that the platform admin analytics endpoint for
 * moderation audit logs correctly applies complex filter combinations on
 * immutable audit data, returns paginated summaries, and does not leak filters
 * between calls.
 *
 * High-level flow:
 *
 * 1. Register a platform administrator via POST /auth/platformAdmin/join and rely
 *    on the SDK to attach the Authorization header for subsequent calls.
 * 2. Execute a first PATCH
 *    /communityPlatform/platformAdmin/analytics/moderationAuditLogs request
 *    with ICommunityPlatformModerationAuditLog.IRequest that targets community
 *    moderator actions (actorTypes = ["communityModerator"]) and a restricted
 *    subset of actionTypes and outcomeStatuses.
 * 3. Assert that the response is a valid
 *    IPageICommunityPlatformModerationAuditLog.ISummary, that all returned
 *    summaries respect the requested actionTypes/outcomeStatuses, and that
 *    actor identity fields are consistent with community-level moderation
 *    (communitymoderator_id presence vs. platformadmin_id absence) when such
 *    records exist.
 * 4. Execute a second PATCH call with actorTypes filtered to ["platformAdmin"] and
 *    a different actionTypes subset, and verify that the new results are
 *    independent of the first request’s filters and that platformadmin_id vs.
 *    communitymoderator_id presence reflects platform-admin-driven actions when
 *    records exist.
 * 5. Finally, send an over-constrained filter combination that is likely to yield
 *    zero results (for example, impossible combinations of
 *    actorTypes/actionTypes and outcomeStatuses) and assert that the endpoint
 *    still returns a valid pagination object with data as an empty array.
 */
export async function test_api_moderation_audit_logs_analytics_multi_dimension_filters(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and start an authenticated session.
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. First analytics call – community moderator-focused filters.
  const firstRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    actorTypes: ["communityModerator"],
    actionTypes: ["content_removed", "user_banned"],
    outcomeStatuses: ["sanction_applied", "removed"],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const firstPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
      connection,
      { body: firstRequestBody },
    );
  typia.assert(firstPage);

  // Validate pagination shape for first response.
  TestValidator.predicate("first page has valid pagination metadata", () => {
    const p = firstPage.pagination;
    return (
      typeof p.current === "number" &&
      typeof p.limit === "number" &&
      typeof p.records === "number" &&
      typeof p.pages === "number" &&
      p.current >= 0 &&
      p.limit >= 0 &&
      p.records >= 0 &&
      p.pages >= 0
    );
  });

  // Assert every returned summary respects action/outcome filters and,
  // when possible, that actor identity is community moderator–aligned.
  for (const log of firstPage.data) {
    TestValidator.predicate(
      "first page log action_type within requested list",
      firstRequestBody.actionTypes?.includes(log.action_type) ?? false,
    );
    TestValidator.predicate(
      "first page log outcome within requested outcomeStatuses",
      firstRequestBody.outcomeStatuses?.includes(log.outcome) ?? false,
    );

    // If the implementation encodes actor type via communitymoderator_id
    // vs platformadmin_id, we can perform soft validation when either field
    // is non-null.
    if (
      log.communitymoderator_id !== null &&
      log.communitymoderator_id !== undefined
    ) {
      TestValidator.predicate(
        "community moderator log should not have platformadmin_id",
        log.platformadmin_id === null || log.platformadmin_id === undefined,
      );
    }
  }

  // 3. Second analytics call – platform admin-focused filters.
  const secondRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    actorTypes: ["platformAdmin"],
    actionTypes: ["queue_routed", "appeal_resolved"],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const secondPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
      connection,
      { body: secondRequestBody },
    );
  typia.assert(secondPage);

  // Validate pagination metadata for second response.
  TestValidator.predicate("second page has valid pagination metadata", () => {
    const p = secondPage.pagination;
    return (
      typeof p.current === "number" &&
      typeof p.limit === "number" &&
      typeof p.records === "number" &&
      typeof p.pages === "number" &&
      p.current >= 0 &&
      p.limit >= 0 &&
      p.records >= 0 &&
      p.pages >= 0
    );
  });

  // Confirm that logs attributed to a platform admin do not also carry
  // a community moderator identifier.
  for (const log of secondPage.data) {
    if (log.platformadmin_id !== null && log.platformadmin_id !== undefined) {
      TestValidator.predicate(
        "platform admin log should not have communitymoderator_id",
        log.communitymoderator_id === null ||
          log.communitymoderator_id === undefined,
      );
    }
  }

  // 4. Third analytics call – over-constrained filter expected to return empty data
  //    but still with valid pagination metadata.
  const thirdRequestBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actorTypes: ["platformAdmin"],
    actionTypes: ["content_removed"],
    outcomeStatuses: ["sanction_applied"],
    communityIds: [
      // Use a random UUID to maximize the chance of zero matches.
      typia.random<string & tags.Format<"uuid">>(),
    ],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const thirdPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.moderationAuditLogs.index(
      connection,
      { body: thirdRequestBody },
    );
  typia.assert(thirdPage);

  const pagination = thirdPage.pagination;
  TestValidator.predicate(
    "third page has structurally valid pagination even when empty",
    () =>
      typeof pagination.current === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.records === "number" &&
      typeof pagination.pages === "number" &&
      pagination.current >= 0 &&
      pagination.limit >= 0 &&
      pagination.records >= 0 &&
      pagination.pages >= 0,
  );

  // When records are zero, data must be an empty array.
  if (pagination.records === 0) {
    TestValidator.equals(
      "empty result set should return empty data array",
      thirdPage.data.length,
      0,
    );
  } else {
    // If records > 0 due to backend data characteristics, still assert that
    // every record respects the filter constraints and actor identity
    // semantics where possible.
    for (const log of thirdPage.data) {
      // action/outcome filters must be honored
      TestValidator.predicate(
        "third page log action_type within requested constrained list",
        thirdRequestBody.actionTypes?.includes(log.action_type) ?? false,
      );
      TestValidator.predicate(
        "third page log outcome within requested constrained outcomeStatuses",
        thirdRequestBody.outcomeStatuses?.includes(log.outcome) ?? false,
      );

      // actorTypes is ["platformAdmin"], so logs that expose a platformadmin_id
      // should not also carry a communitymoderator_id.
      if (log.platformadmin_id !== null && log.platformadmin_id !== undefined) {
        TestValidator.predicate(
          "third page platform admin log should not have communitymoderator_id",
          log.communitymoderator_id === null ||
            log.communitymoderator_id === undefined,
        );
      }
    }
  }
}
