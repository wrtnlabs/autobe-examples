import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_content_flag_search_by_reporter_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // This test focuses on search functionality only since content flag creation
  // is not available in the current API. We'll test the search capabilities
  // with the assumption that some content flags already exist in the system.
  // Create multiple users to act as potential reporters
  const reporter1Connection: api.IConnection = { host: connection.host };
  const reporter1 = await authorize_user_join(reporter1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(reporter1);
  const reporter2Connection: api.IConnection = { host: connection.host };
  const reporter2 = await authorize_user_join(reporter2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(reporter2);
  // Test 1: Basic search functionality - get all flags
  const allFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(allFlags);
  // Test 2: Filter by reporter user ID (if flags exist for this reporter)
  const reporter1Flags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          reporter_user_id: reporter1.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(reporter1Flags);
  // Verify all returned flags belong to the specified reporter (if any exist)
  for (const flag of reporter1Flags.data) {
    TestValidator.equals(
      "reporter user ID matches",
      flag.reporter_user_id,
      reporter1.id,
    );
  }
  // Test 3: Text search within flag reasons (partial matching)
  const searchFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          flag_reason: "content", // Common term that might exist in flag reasons
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(searchFlags);
  // If results are found, verify they contain the search term
  if (searchFlags.data.length > 0) {
    for (const flag of searchFlags.data) {
      TestValidator.predicate(
        "flag reason contains search term",
        flag.flag_reason.toLowerCase().includes("content"),
      );
    }
  }
  // Test 4: Status filtering
  const pendingFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(pendingFlags);
  // Verify all returned flags have the specified status
  for (const flag of pendingFlags.data) {
    TestValidator.equals("status matches", flag.status, "pending");
  }
  // Test 5: Combined filtering - reporter and status
  const combinedFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          reporter_user_id: reporter1.id,
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(combinedFlags);
  for (const flag of combinedFlags.data) {
    TestValidator.equals(
      "reporter matches",
      flag.reporter_user_id,
      reporter1.id,
    );
    TestValidator.equals("status matches", flag.status, "pending");
  }
  // Test 6: Pagination validation
  TestValidator.predicate(
    "pagination current page valid",
    allFlags.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit valid",
    allFlags.pagination.limit >= 1 && allFlags.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    allFlags.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    allFlags.pagination.pages >= 0,
  );
  // Test 7: Empty search term (should return all flags)
  const emptySearchFlags =
    await api.functional.discussionBoard.user.content_flags.index(
      reporter1Connection,
      {
        body: {
          flag_reason: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(emptySearchFlags);
}
