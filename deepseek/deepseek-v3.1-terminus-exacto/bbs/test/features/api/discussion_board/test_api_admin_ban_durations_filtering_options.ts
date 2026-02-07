import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanDuration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_durations_filtering_options(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Partial name matching search
  const searchConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(searchConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const searchResults =
    await api.functional.discussionBoard.admin.ban_durations.index(
      searchConnection,
      {
        body: {
          search: "ban",
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.predicate(
    "search returns results",
    searchResults.data.length > 0,
  );
  // Validate search criteria
  if (searchResults.data.length > 0) {
    TestValidator.predicate(
      "search results contain search term",
      searchResults.data.some((duration) =>
        duration.name.toLowerCase().includes("ban"),
      ),
    );
  }
  // Test 2: Duration range filtering
  const rangeConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(rangeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const rangeResults =
    await api.functional.discussionBoard.admin.ban_durations.index(
      rangeConnection,
      {
        body: {
          duration_hours_min: 1,
          duration_hours_max: 24,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(rangeResults);
  if (rangeResults.data.length > 0) {
    TestValidator.predicate(
      "duration range filter valid",
      rangeResults.data.every(
        (duration) =>
          duration.duration_hours >= 1 && duration.duration_hours <= 24,
      ),
    );
  }
  // Test 3: Permanent status filtering
  const permanentConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(permanentConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const permanentResults =
    await api.functional.discussionBoard.admin.ban_durations.index(
      permanentConnection,
      {
        body: {
          is_permanent: true,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(permanentResults);
  if (permanentResults.data.length > 0) {
    TestValidator.predicate(
      "permanent filter valid",
      permanentResults.data.every((duration) => duration.is_permanent === true),
    );
  }
  // Test 4: Combined filtering
  const combinedConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(combinedConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const combinedResults =
    await api.functional.discussionBoard.admin.ban_durations.index(
      combinedConnection,
      {
        body: {
          search: "day",
          duration_hours_min: 1,
          duration_hours_max: 168,
          is_permanent: false,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(combinedResults);
  if (combinedResults.data.length > 0) {
    TestValidator.predicate(
      "combined filter valid",
      combinedResults.data.every(
        (duration) =>
          duration.name.toLowerCase().includes("day") &&
          duration.duration_hours >= 1 &&
          duration.duration_hours <= 168 &&
          duration.is_permanent === false,
      ),
    );
  }
  // Test pagination with custom parameters
  const paginationConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(paginationConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const paginationResults =
    await api.functional.discussionBoard.admin.ban_durations.index(
      paginationConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanDuration.IRequest,
      },
    );
  typia.assert(paginationResults);
  TestValidator.equals(
    "pagination limit matches",
    paginationResults.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination current page",
    paginationResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    paginationResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    paginationResults.pagination.pages >= 0,
  );
}
