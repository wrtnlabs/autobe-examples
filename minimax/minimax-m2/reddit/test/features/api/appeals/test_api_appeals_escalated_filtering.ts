import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_escalated_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create registered user account for testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";

  const user: IRedditPlatformRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: {
        username: `testuser_${RandomGenerator.alphaNumeric(8)}`,
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditPlatformRegisteredUser.ICreate,
    });
  typia.assert(user);

  // Step 2: Test appeals filtering with is_escalated = true
  const escalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(escalatedAppeals);

  // Verify that returned appeals have is_escalated = true
  for (const appeal of escalatedAppeals.data) {
    TestValidator.equals(
      "All appeals should be escalated",
      appeal.is_escalated,
      true,
    );
  }

  // Step 3: Test appeals filtering with is_escalated = false
  const nonEscalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: false,
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(nonEscalatedAppeals);

  // Verify that returned appeals have is_escalated = false
  for (const appeal of nonEscalatedAppeals.data) {
    TestValidator.equals(
      "All appeals should be non-escalated",
      appeal.is_escalated,
      false,
    );
  }

  // Step 4: Test appeals filtering without escalation filter (all appeals)
  const allAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(allAppeals);

  // Verify pagination structure
  TestValidator.equals(
    "Should have valid pagination data",
    allAppeals.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "Should have valid limit",
    allAppeals.pagination.limit >= 0,
    true,
  );

  // Step 5: Test pagination with escalated filtering
  const paginatedEscalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedEscalatedAppeals);

  // Verify pagination values
  TestValidator.equals(
    "Pagination should reflect page 2",
    paginatedEscalatedAppeals.pagination.current,
    2,
  );
  TestValidator.equals(
    "Pagination should reflect limit of 10",
    paginatedEscalatedAppeals.pagination.limit,
    10,
  );

  // Step 6: Test sorting with escalated filtering
  const sortedEscalatedAppeals: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.registeredUser.appeals.index(
      connection,
      {
        body: {
          is_escalated: true,
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "asc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedEscalatedAppeals);

  // Verify that appeals are properly filtered by escalation status
  TestValidator.predicate(
    "Escalated filtering should work correctly",
    sortedEscalatedAppeals.data.every((appeal) => appeal.is_escalated === true),
  );
}
