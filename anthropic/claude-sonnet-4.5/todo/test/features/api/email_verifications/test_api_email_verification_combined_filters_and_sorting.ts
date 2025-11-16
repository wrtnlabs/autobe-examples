import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test complex queries combining multiple filters and sorting options for email
 * verifications.
 *
 * This test validates the advanced querying capabilities needed for
 * administrative interfaces and user dashboards where multiple criteria must be
 * applied together. It tests various combinations of filters (verified status,
 * expired status) with different sorting options (by creation date, by
 * expiration date) to ensure the API correctly handles complex queries.
 *
 * Steps:
 *
 * 1. Create and authenticate a user account
 * 2. Retrieve initial email verification records
 * 3. Test active pending verifications: verified=false, expired=false, sort by
 *    created_at desc
 * 4. Test all verifications sorted by expires_at ascending
 * 5. Test pagination with combined filters
 * 6. Validate all filters and sorting are applied correctly
 */
export async function test_api_email_verification_combined_filters_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a user account
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "securePassword123";

  const user: ITodoListUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: {
        email: userEmail,
        password: userPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ITodoListUser.ICreate,
    },
  );
  typia.assert(user);

  // Step 2: Retrieve all email verification records for the user
  const allVerificationsPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {} satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(allVerificationsPage);

  TestValidator.predicate(
    "user should have at least one verification record",
    allVerificationsPage.data.length > 0,
  );

  // Step 3: Test combined filters - active pending verifications (not verified, not expired)
  // Sort by created_at descending to show newest first
  const activePendingPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          verified: false,
          expired: false,
          sort_by: "created_at",
          order: "desc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(activePendingPage);

  // Validate all records match the filter criteria
  for (const verification of activePendingPage.data) {
    TestValidator.equals(
      "verification should not be verified",
      verification.verified,
      false,
    );

    // Check that expires_at is in the future (not expired)
    const expiresAt = new Date(verification.expires_at);
    const now = new Date();
    TestValidator.predicate(
      "verification should not be expired",
      expiresAt > now,
    );
  }

  // Validate sorting by created_at descending
  if (activePendingPage.data.length > 1) {
    for (let i = 0; i < activePendingPage.data.length - 1; i++) {
      const current = new Date(activePendingPage.data[i].created_at);
      const next = new Date(activePendingPage.data[i + 1].created_at);
      TestValidator.predicate(
        "records should be sorted by created_at descending",
        current >= next,
      );
    }
  }

  // Step 4: Test different sorting - sort by expires_at ascending
  const sortedByExpiresPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          sort_by: "expires_at",
          order: "asc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(sortedByExpiresPage);

  // Validate sorting by expires_at ascending
  if (sortedByExpiresPage.data.length > 1) {
    for (let i = 0; i < sortedByExpiresPage.data.length - 1; i++) {
      const current = new Date(sortedByExpiresPage.data[i].expires_at);
      const next = new Date(sortedByExpiresPage.data[i + 1].expires_at);
      TestValidator.predicate(
        "records should be sorted by expires_at ascending",
        current <= next,
      );
    }
  }

  // Step 5: Test pagination with combined filters
  const paginatedPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: 10,
          verified: false,
          sort_by: "created_at",
          order: "desc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(paginatedPage);

  TestValidator.predicate(
    "pagination current page should be valid",
    paginatedPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be respected",
    paginatedPage.data.length <= 10,
  );

  // Step 6: Test combination of verified filter with sorting
  const verifiedFilterPage: IPageITodoListEmailVerification.ISummary =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          verified: false,
          sort_by: "expires_at",
          order: "asc",
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(verifiedFilterPage);

  // Validate filter is applied correctly
  for (const verification of verifiedFilterPage.data) {
    TestValidator.equals(
      "all records should match verified=false filter",
      verification.verified,
      false,
    );
  }

  // Validate sorting is applied
  if (verifiedFilterPage.data.length > 1) {
    for (let i = 0; i < verifiedFilterPage.data.length - 1; i++) {
      const current = new Date(verifiedFilterPage.data[i].expires_at);
      const next = new Date(verifiedFilterPage.data[i + 1].expires_at);
      TestValidator.predicate(
        "records should be sorted by expires_at ascending with filter",
        current <= next,
      );
    }
  }
}
