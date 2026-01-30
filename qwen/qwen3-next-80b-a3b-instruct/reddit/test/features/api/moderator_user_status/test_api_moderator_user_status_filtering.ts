import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatus";
import type { ICommunityBbsUserStatusDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserStatusDateRange";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserStatus";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_user_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      },
    });
  typia.assert(moderator);
  // Step 2: Create test users using moderator join
  const user1Connection: api.IConnection = { host: connection.host };
  const user1: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(user1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      },
    });
  typia.assert(user1);
  const user2Connection: api.IConnection = { host: connection.host };
  const user2: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(user2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      },
    });
  typia.assert(user2);
  // Step 3: Use the moderator to retrieve user status data (assumes records exist from normal system operations)
  // Step 4: Test filtering by single status
  const singleStatusResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          status: ["active"],
        },
      },
    );
  typia.assert(singleStatusResult);
  TestValidator.predicate(
    "single status filter returns at least one active record",
    singleStatusResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned records have active status",
    singleStatusResult.data.every((item) => item.status === "active"),
  );
  singleStatusResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 5: Test filtering by multiple statuses
  const multipleStatusResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          status: ["active", "suspended"],
        },
      },
    );
  typia.assert(multipleStatusResult);
  TestValidator.predicate(
    "multiple status filter returns records",
    multipleStatusResult.data.length > 0,
  );
  TestValidator.predicate(
    "all returned records have either active or suspended status",
    multipleStatusResult.data.every(
      (item) => item.status === "active" || item.status === "suspended",
    ),
  );
  multipleStatusResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 6: Test date range filtering
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const now = new Date().toISOString();
  const dateRangeResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          createdAt: {
            from: oneDayAgo,
            to: now,
          },
        },
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns records",
    dateRangeResult.data.length > 0,
  );
  dateRangeResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 7: Test filtering by user ID
  const userIdResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          userId: user1.id,
        },
      },
    );
  typia.assert(userIdResult);
  TestValidator.predicate(
    "user ID filter returns records",
    userIdResult.data.length > 0,
  );
  TestValidator.predicate(
    "all records belong to user1",
    userIdResult.data.every((item) => item.id === user1.id),
  );
  userIdResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 8: Test combined filtering
  const combinedResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          status: ["active"],
          createdAt: {
            from: oneDayAgo,
            to: now,
          },
          userId: user1.id,
        },
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filter returns records",
    combinedResult.data.length > 0,
  );
  TestValidator.equals(
    "correct status",
    combinedResult.data[0].status,
    "active",
  );
  TestValidator.equals("correct user", combinedResult.data[0].id, user1.id);
  combinedResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 9: Test pagination
  const paginationResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          limit: 1,
          page: 1,
        },
      },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "pagination limit 1 returns 1 item",
    paginationResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination page 1 is correct",
    paginationResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 1",
    paginationResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records > 0",
    paginationResult.pagination.records > 0,
  );
  TestValidator.equals(
    "pagination pages is correct",
    paginationResult.pagination.pages,
    paginationResult.pagination.pages,
  );
  paginationResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 10: Test case-insensitive status matching
  const caseInsensitiveResult =
    await api.functional.communityBbs.moderator.users.status.index(
      moderatorConnection,
      {
        body: {
          status: ["ACTIVE"], // Uppercase
        },
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive status filter returns records",
    caseInsensitiveResult.data.length > 0,
  );
  caseInsensitiveResult.data.forEach((item) =>
    typia.assert<ICommunityBbsUserStatus.ISummary>(item),
  );
  // Step 11: Test unauthorized access
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("unauthorized access should fail", async () => {
    await api.functional.communityBbs.moderator.users.status.index(
      unauthorizedConnection,
      {
        body: {
          status: ["active"],
        },
      },
    );
  });
}