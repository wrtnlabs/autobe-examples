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

export async function test_api_moderation_audit_logs_search_by_actor_and_community(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin so that we can call analytics endpoints.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Build a search filter for moderation audit logs.
  // Since we don't control underlying data, we choose broad filters that are still
  // structurally valid and then refine expectations based on the response.
  const baseRequestBody = {
    page: 1,
    limit: 50,
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const initialPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      {
        body: baseRequestBody,
      },
    );
  typia.assert(initialPage);

  // Basic pagination structure checks.
  TestValidator.predicate(
    "initial page pagination current is non-negative",
    () => initialPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "initial page pagination limit is non-negative",
    () => initialPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "initial page pagination records is non-negative",
    () => initialPage.pagination.records >= 0,
  );

  if (initialPage.data.length === 0) {
    // No further semantic checks possible without records.
    return;
  }

  // 3. Derive a concrete filter from existing data to emulate actor/community filtering.
  // Pick a record that has a community_id and either communitymoderator_id or platformadmin_id.
  const candidate: ICommunityPlatformModerationAuditLog.ISummary | undefined =
    initialPage.data.find(
      (log) =>
        log.community_id !== null &&
        log.community_id !== undefined &&
        ((log.communitymoderator_id !== null &&
          log.communitymoderator_id !== undefined) ||
          (log.platformadmin_id !== null &&
            log.platformadmin_id !== undefined)),
    );

  if (!candidate) {
    // If no suitable candidate exists, we cannot assert actor/community filters
    // but we already validated structure and basic pagination.
    return;
  }

  // Extract actor and community identifiers from the candidate, validating non-null values.
  const communityId = typia.assert<string & tags.Format<"uuid">>(
    candidate.community_id!,
  );
  const actorId =
    candidate.communitymoderator_id !== null &&
    candidate.communitymoderator_id !== undefined
      ? typia.assert<string & tags.Format<"uuid">>(
          candidate.communitymoderator_id!,
        )
      : typia.assert<string & tags.Format<"uuid">>(candidate.platformadmin_id!);

  // 4. Build a filtered request: actorIds and communityIds.
  // We cannot know exact actorTypes values accepted by backend, so we only
  // leverage actorIds and communityIds for concrete assertions.
  const filteredRequestBody = {
    page: 1,
    limit: 50,
    actorIds: [actorId],
    communityIds: [communityId],
  } satisfies ICommunityPlatformModerationAuditLog.IRequest;

  const filteredPage: IPageICommunityPlatformModerationAuditLog.ISummary =
    await api.functional.communityPlatform.platformAdmin.analytics.auditLogs.index(
      connection,
      {
        body: filteredRequestBody,
      },
    );
  typia.assert(filteredPage);

  // 5. Assert pagination basics for the filtered result.
  TestValidator.predicate(
    "filtered page current is non-negative",
    () => filteredPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "filtered page limit is non-negative",
    () => filteredPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "filtered page records is non-negative",
    () => filteredPage.pagination.records >= 0,
  );

  // 6. For every returned record, verify that community_id and actor reference
  // satisfy the filters conjunctively when present.
  for (const log of filteredPage.data) {
    // community_id must either match the requested community or be null when
    // not applicable; for moderation entries scoped to a community, we expect
    // equality.
    if (log.community_id !== null && log.community_id !== undefined) {
      TestValidator.equals(
        "audit log community_id should match filtered communityId",
        log.community_id,
        communityId,
      );
    }

    // Actor must match selected actor when community or platform actor field is present.
    const logActorId =
      log.communitymoderator_id !== null &&
      log.communitymoderator_id !== undefined
        ? log.communitymoderator_id
        : log.platformadmin_id;

    if (logActorId !== null && logActorId !== undefined) {
      TestValidator.equals(
        "audit log actor id should match filtered actorId when present",
        logActorId,
        actorId,
      );
    }
  }
}
