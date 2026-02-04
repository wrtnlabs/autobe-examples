import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserEmailVerification";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_email_verification_history_retrieval_by_user(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Verify that user has no email verification records initially
  const initialHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {} satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(initialHistory);
  TestValidator.equals(
    "initial verification history empty",
    initialHistory.data.length,
    0,
  );
  // Step 3: Validate that different status filters work correctly (pending, completed, expired)
  // Note: User's status starts as pending after registration
  const pendingHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          status: "pending",
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(pendingHistory);
  TestValidator.equals(
    "pending status filter returns 1 record",
    pendingHistory.data.length,
    1,
  );
  TestValidator.equals(
    "pending status matches",
    pendingHistory.data[0].status,
    "pending",
  );
  // Step 4: Validate that pagination works correctly with page and limit parameters
  const paginationHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(paginationHistory);
  TestValidator.equals(
    "pagination page is 1",
    paginationHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 5",
    paginationHistory.pagination.limit,
    5,
  );
  TestValidator.equals(
    "pagination records includes the single verification record",
    paginationHistory.pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination pages is 1",
    paginationHistory.pagination.pages,
    1,
  );
  TestValidator.predicate(
    "data array has correct size",
    () => paginationHistory.data.length <= 5,
  );
  // Step 5: Validate that sorting by created_at (asc/desc) works correctly
  // Server sorts by created_at descending by default
  const descendingHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(descendingHistory);
  TestValidator.equals(
    "descending sort has 1 record",
    descendingHistory.data.length,
    1,
  );
  // Step 6: Validate ascending sorting
  const ascendingHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(ascendingHistory);
  TestValidator.equals(
    "ascending sort has 1 record",
    ascendingHistory.data.length,
    1,
  );
  // Step 7: Validate date range filtering
  const createdAt = descendingHistory.data[0].createdAt;
  const dateRangeHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_from: createdAt,
          created_at_to: createdAt,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeHistory);
  TestValidator.equals(
    "date range filter returns 1 record",
    dateRangeHistory.data.length,
    1,
  );
  TestValidator.equals(
    "date range filter matches created_at",
    dateRangeHistory.data[0].createdAt,
    createdAt,
  );
  // Step 8: Validate that users cannot access other users' data
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_user_join(otherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(otherUser);
  // Validate that other user cannot see the first user's verification record
  const otherUserHistory =
    await api.functional.todoApp.user.email_verifications.index(
      otherUserConnection,
      {
        body: {} satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(otherUserHistory);
  TestValidator.equals(
    "other user verification history empty",
    otherUserHistory.data.length,
    0,
  );
  // Step 9: Validate successful retrieval of completed status after verification
  const completedHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          status: "completed",
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(completedHistory);
  TestValidator.equals(
    "completed status filter returns 0 records",
    completedHistory.data.length,
    0,
  );
  // Step 10: Validate successful retrieval of expired status
  const expiredHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          status: "expired",
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(expiredHistory);
  TestValidator.equals(
    "expired status filter returns 0 records",
    expiredHistory.data.length,
    0,
  );
  // Step 11: Validate that filtering by status and date range together works correctly
  const combinedFilterHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          status: "pending",
          created_at_from: createdAt,
          created_at_to: createdAt,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(combinedFilterHistory);
  TestValidator.equals(
    "combined filter returns 1 record",
    combinedFilterHistory.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter status matches",
    combinedFilterHistory.data[0].status,
    "pending",
  );
  TestValidator.equals(
    "combined filter dates match",
    combinedFilterHistory.data[0].createdAt,
    createdAt,
  );
  // Step 12: Validate pagination with edge cases - single page with one record
  const singleRecordHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(singleRecordHistory);
  TestValidator.equals(
    "single record pagination returns correct page count",
    singleRecordHistory.pagination.pages,
    1,
  );
  TestValidator.equals(
    "single record pagination returns correct records count",
    singleRecordHistory.pagination.records,
    1,
  );
  TestValidator.equals(
    "single record pagination returns 1 data item",
    singleRecordHistory.data.length,
    1,
  );
  // Step 13: Validate sorting with null default values
  const defaultSortHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          // No sort_by or sort_order specified (uses default)
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(defaultSortHistory);
  // Step 14: Validate date range with only one bound
  const dateRangeFromHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_from: createdAt,
          // created_at_to omitted
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeFromHistory);
  TestValidator.predicate(
    "date range from returns at least 1 record",
    () => dateRangeFromHistory.data.length >= 1,
  );
  const dateRangeToHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          created_at_to: createdAt,
          // created_at_from omitted
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(dateRangeToHistory);
  TestValidator.predicate(
    "date range to returns at least 1 record",
    () => dateRangeToHistory.data.length >= 1,
  );
  // Validate that all valid parameters work together
  const completeFilterHistory =
    await api.functional.todoApp.user.email_verifications.index(
      userConnection,
      {
        body: {
          status: "pending",
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
          created_at_from: createdAt,
          created_at_to: createdAt,
        } satisfies ITodoAppUserEmailVerification.IRequest,
      },
    );
  typia.assert(completeFilterHistory);
  TestValidator.equals(
    "complete filter returns 1 record",
    completeFilterHistory.data.length,
    1,
  );
  TestValidator.equals(
    "complete filter status matches",
    completeFilterHistory.data[0].status,
    "pending",
  );
  TestValidator.equals(
    "complete filter dates match",
    completeFilterHistory.data[0].createdAt,
    createdAt,
  );
}
