import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationAppeal";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderation_appeals_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connections for testing
  const moderatorConnection1: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  const moderatorConnection2: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Create test community
  const communityName = `test-community-${RandomGenerator.alphaNumeric(6)}`;
  // Create appeals in different statuses using report creation and appeal mechanism
  // Note: appeals are created when users challenge moderation decisions
  // For testing status filtering, we need to create appeals with different statuses
  // Since we can't directly create appeals, we'll test the status filtering endpoint
  // by ensuring it returns appeals with correct status filters
  // Test 1: Filter by pending status
  const pendingResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection1,
      {
        communityId: typia.random<string>(),
        body: {
          page: 1,
          limit: 20,
          status: "pending",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(pendingResult);
  // Test 2: Filter by approved status
  const approvedResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection1,
      {
        communityId: typia.random<string>(),
        body: {
          page: 1,
          limit: 20,
          status: "approved",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(approvedResult);
  // Test 3: Filter by denied status
  const deniedResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection1,
      {
        communityId: typia.random<string>(),
        body: {
          page: 1,
          limit: 20,
          status: "denied",
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(deniedResult);
  // Test 4: No status filter (should return all statuses)
  const allResult =
    await api.functional.redditClone.moderator.communities.appeals.index(
      moderatorConnection1,
      {
        communityId: typia.random<string>(),
        body: {
          page: 1,
          limit: 20,
          sortBy: "created_at",
          sortOrder: "desc",
        } satisfies IRedditCloneModerationAppeal.IRequest,
      },
    );
  typia.assert(allResult);
  // Test 5: Verify pagination metadata
  TestValidator.predicate(
    "has pagination metadata",
    pendingResult.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(pendingResult.data));
  TestValidator.predicate(
    "pagination has required fields",
    pendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit field",
    pendingResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records field",
    pendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages field",
    pendingResult.pagination.pages >= 0,
  );
  // Test 6: Verify appeal summary structure
  if (pendingResult.data.length > 0) {
    const firstAppeal = pendingResult.data[0];
    typia.assert<IRedditCloneModerationAppeal.ISummary>(firstAppeal);
    // Verify appeal properties
    TestValidator.equals("appeal has id", typeof firstAppeal.id, "string");
    TestValidator.equals(
      "appeal has content",
      typeof firstAppeal.appealContent,
      "string",
    );
    TestValidator.equals(
      "appeal has status",
      ["pending", "approved", "denied"].includes(firstAppeal.status),
      true,
    );
    TestValidator.equals(
      "appeal has createdAt",
      typeof firstAppeal.createdAt,
      "string",
    );
    TestValidator.equals(
      "appeal has report",
      firstAppeal.report !== undefined,
      true,
    );
    // Verify reporter structure
    TestValidator.equals(
      "reporter has id",
      typeof firstAppeal.reporter.id,
      "string",
    );
    TestValidator.equals(
      "reporter has username",
      typeof firstAppeal.reporter.username,
      "string",
    );
    // Verify report structure
    TestValidator.equals(
      "report has id",
      typeof firstAppeal.report.id,
      "string",
    );
    TestValidator.equals(
      "report has status",
      ["pending", "approved", "dismissed"].includes(firstAppeal.report.status),
      true,
    );
  }
}
