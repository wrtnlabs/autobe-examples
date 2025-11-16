import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListEmailVerification";
import type { ITodoListEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListEmailVerification";
import type { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test pagination functionality when navigating through multiple pages of email
 * verification records.
 *
 * This scenario validates the complete pagination implementation for email
 * verification records:
 *
 * 1. User account creation to generate initial verification records
 * 2. Generation of multiple verification records through password reset requests
 * 3. Requesting the first page with a specific page size limit
 * 4. Verifying pagination metadata includes correct current page, total records,
 *    total pages, and limit values
 * 5. Requesting subsequent pages and verifying page navigation works correctly
 * 6. Ensuring records are properly distributed across pages without duplication or
 *    omission
 *
 * This comprehensive test validates that the pagination API correctly handles
 * large verification histories with proper page navigation, accurate metadata,
 * and data integrity across pages.
 */
export async function test_api_email_verification_pagination_navigation(
  connection: api.IConnection,
) {
  // Step 1: Create a user account (generates initial email verification record)
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123!";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoListUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Generate additional verification records through password reset requests
  // This creates more data volume for meaningful pagination testing
  const passwordResetCount = 5;
  await ArrayUtil.asyncRepeat(passwordResetCount, async () => {
    const resetResult =
      await api.functional.auth.user.password.reset.request.requestPasswordReset(
        connection,
        {
          body: {
            email: userEmail,
          } satisfies ITodoListPasswordReset.IRequest,
        },
      );
    typia.assert(resetResult);
  });

  // Step 3: Request the first page with a specific page size limit
  const pageLimit = 2;
  const firstPage =
    await api.functional.todoList.user.users.emailVerifications.index(
      connection,
      {
        userId: user.id,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies ITodoListEmailVerification.IRequest,
      },
    );
  typia.assert(firstPage);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "first page current should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit should match requested limit",
    firstPage.pagination.limit,
    pageLimit,
  );
  TestValidator.predicate(
    "total records should be positive",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages should be positive",
    firstPage.pagination.pages > 0,
  );
  TestValidator.equals(
    "calculated pages should match reported pages",
    Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
    firstPage.pagination.pages,
  );
  TestValidator.predicate(
    "first page data should not exceed limit",
    firstPage.data.length <= pageLimit,
  );

  // Step 5: Request subsequent pages and verify page navigation works correctly
  const allRecordIds = new Set<string>();
  const totalPages = firstPage.pagination.pages;
  const totalRecords = firstPage.pagination.records;

  // Collect IDs from first page
  firstPage.data.forEach((record) => {
    allRecordIds.add(record.id);
  });

  // Navigate through remaining pages
  for (let pageNum = 2; pageNum <= totalPages; pageNum++) {
    const currentPage =
      await api.functional.todoList.user.users.emailVerifications.index(
        connection,
        {
          userId: user.id,
          body: {
            page: pageNum,
            limit: pageLimit,
          } satisfies ITodoListEmailVerification.IRequest,
        },
      );
    typia.assert(currentPage);

    // Validate pagination metadata for current page
    TestValidator.equals(
      `page ${pageNum} current should be ${pageNum}`,
      currentPage.pagination.current,
      pageNum,
    );
    TestValidator.equals(
      `page ${pageNum} limit should match`,
      currentPage.pagination.limit,
      pageLimit,
    );
    TestValidator.equals(
      `page ${pageNum} total records should match`,
      currentPage.pagination.records,
      totalRecords,
    );
    TestValidator.equals(
      `page ${pageNum} total pages should match`,
      currentPage.pagination.pages,
      totalPages,
    );

    // Verify data size constraints
    const isLastPage = pageNum === totalPages;
    if (isLastPage) {
      const expectedLastPageSize = totalRecords % pageLimit || pageLimit;
      TestValidator.predicate(
        `last page should have correct number of records`,
        currentPage.data.length <= pageLimit,
      );
    } else {
      TestValidator.equals(
        `page ${pageNum} should have full page of records`,
        currentPage.data.length,
        pageLimit,
      );
    }

    // Step 6: Ensure no duplication across pages
    currentPage.data.forEach((record) => {
      TestValidator.predicate(
        `record ${record.id} should not be duplicated across pages`,
        !allRecordIds.has(record.id),
      );
      allRecordIds.add(record.id);
    });
  }

  // Final validation: verify total collected records match reported total
  TestValidator.equals(
    "total collected records should match reported total",
    allRecordIds.size,
    totalRecords,
  );
}
