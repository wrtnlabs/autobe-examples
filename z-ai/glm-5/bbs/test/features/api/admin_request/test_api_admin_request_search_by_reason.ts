import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_admin_requests_create } from "../../../generate/generate_random_discussion_board_user_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test admin request search by reason with case-insensitive partial matching.
 *
 * Scenario:
 * 1. Create two users with different admin requests
 * 2. One request contains "moderator" keyword, other does not
 * 3. Test various search patterns (case variations, partial match, non-existent)
 */
export async function test_api_admin_request_search_by_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create first user with admin request containing "moderator"
  const user1Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const request1 =
    await generate_random_discussion_board_user_admin_requests_create(
      user1Connection,
      {
        body: {
          reason:
            "I am an experienced moderator with community management skills and have successfully managed multiple online communities for over five years.",
        },
      },
    );
  typia.assert(request1);
  // Create second user with admin request NOT containing "moderator"
  const user2Connection: api.IConnection = { host: connection.host };
  await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const request2 =
    await generate_random_discussion_board_user_admin_requests_create(
      user2Connection,
      {
        body: {
          reason:
            "I am a community contributor with excellent track record and have been actively participating in discussions for many years.",
        },
      },
    );
  typia.assert(request2);
  // Test 1: Search with lowercase "moderator"
  const searchLower =
    await api.functional.discussionBoard.user.adminRequests.index(connection, {
      body: {
        search: "moderator",
      } satisfies IDiscussionBoardAdminRequest.IRequest,
    });
  typia.assert(searchLower);
  TestValidator.predicate(
    "lowercase search contains request1",
    searchLower.data.some((r) => r.id === request1.id),
  );
  TestValidator.predicate(
    "lowercase search excludes request2",
    !searchLower.data.some((r) => r.id === request2.id),
  );
  // Test 2: Search with uppercase "MODERATOR"
  const searchUpper =
    await api.functional.discussionBoard.user.adminRequests.index(connection, {
      body: {
        search: "MODERATOR",
      } satisfies IDiscussionBoardAdminRequest.IRequest,
    });
  typia.assert(searchUpper);
  TestValidator.equals(
    "uppercase search returns same count",
    searchUpper.data.length,
    searchLower.data.length,
  );
  TestValidator.predicate(
    "uppercase search contains request1",
    searchUpper.data.some((r) => r.id === request1.id),
  );
  // Test 3: Search with partial word "mod"
  const searchPartial =
    await api.functional.discussionBoard.user.adminRequests.index(connection, {
      body: {
        search: "mod",
      } satisfies IDiscussionBoardAdminRequest.IRequest,
    });
  typia.assert(searchPartial);
  TestValidator.predicate(
    "partial search contains request1",
    searchPartial.data.some((r) => r.id === request1.id),
  );
  TestValidator.predicate(
    "partial search excludes request2",
    !searchPartial.data.some((r) => r.id === request2.id),
  );
  // Test 4: Search with mixed case "MoDeRaToR"
  const searchMixed =
    await api.functional.discussionBoard.user.adminRequests.index(connection, {
      body: {
        search: "MoDeRaToR",
      } satisfies IDiscussionBoardAdminRequest.IRequest,
    });
  typia.assert(searchMixed);
  TestValidator.equals(
    "mixed case search returns same count",
    searchMixed.data.length,
    searchLower.data.length,
  );
  // Test 5: Search with non-existent keyword
  const searchNonExistent =
    await api.functional.discussionBoard.user.adminRequests.index(connection, {
      body: {
        search: "xyznonexistentkeyword",
      } satisfies IDiscussionBoardAdminRequest.IRequest,
    });
  typia.assert(searchNonExistent);
  TestValidator.equals(
    "non-existent search returns empty data",
    searchNonExistent.data.length,
    0,
  );
  TestValidator.equals(
    "non-existent search has records 0",
    searchNonExistent.pagination.records,
    0,
  );
}
