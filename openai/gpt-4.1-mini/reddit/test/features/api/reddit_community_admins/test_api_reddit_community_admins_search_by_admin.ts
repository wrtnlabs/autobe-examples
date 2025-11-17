import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityAdmin";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";

/**
 * Test searching and filtering Reddit Community Administrator accounts.
 *
 * This test authenticates as an admin, creates multiple admin accounts, and
 * then performs search and filtering via the PATCH endpoint with various
 * filters, pagination, and sorting options.
 *
 * It ensures that the API endpoint responds only to authenticated admin users,
 * and that the search results match the requested filters including email,
 * active status, search keywords, pagination page & limit, and sorting by email
 * or creation date.
 */
export async function test_api_reddit_community_admins_search_by_admin(
  connection: api.IConnection,
) {
  // Admin signup and authentication
  const adminAuth: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "AdminPass123!",
        href: "https://example.com/admin-join",
        referrer: "https://example.com/",
      } satisfies IRedditCommunityAdmin.IJoin,
    });
  typia.assert(adminAuth);

  // Create multiple admins for search tests
  const admins: IRedditCommunityAdmin[] = [];
  for (let i = 0; i < 10; i++) {
    const createBody = {
      email: `user_${RandomGenerator.alphaNumeric(6)}@example.com`,
      password: "UserPass123!",
    } satisfies IRedditCommunityAdmin.ICreate;

    const createdAdmin =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
        connection,
        { body: createBody },
      );
    typia.assert(createdAdmin);
    admins.push(createdAdmin);
  }

  // Search by email with pagination
  {
    const emailToSearch = admins[0].email;
    const searchBody = {
      email: emailToSearch,
      page: 1,
      limit: 10,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    TestValidator.predicate(
      "all results match email filter",
      searchResult.data.every((admin) => admin.email === emailToSearch),
    );
  }

  // Search by is_active flag
  {
    const searchBody = {
      is_active: true,
      page: 1,
      limit: 10,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    TestValidator.predicate(
      "all results are active (deleted_at null or undefined)",
      searchResult.data.every(
        (admin) => admin.deleted_at === null || admin.deleted_at === undefined,
      ),
    );
  }

  // Full text search with substring of email
  {
    const randomEmail = RandomGenerator.pick(admins).email;
    const substringKeyword = randomEmail.substring(
      1,
      Math.min(randomEmail.length, 5),
    );

    const searchBody = {
      search: substringKeyword,
      page: 1,
      limit: 10,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    TestValidator.predicate(
      `all results contain substring ${substringKeyword}`,
      searchResult.data.every((admin) =>
        admin.email.includes(substringKeyword),
      ),
    );
  }

  // Pagination check with more entries
  {
    while (admins.length < 20) {
      const createBody = {
        email: `extra_${RandomGenerator.alphaNumeric(6)}@example.com`,
        password: "ExtraPass123!",
      } satisfies IRedditCommunityAdmin.ICreate;

      const createdAdmin =
        await api.functional.redditCommunity.admin.redditCommunityAdmins.create(
          connection,
          { body: createBody },
        );
      typia.assert(createdAdmin);
      admins.push(createdAdmin);
    }

    const page = 2;
    const limit = 10;
    const searchBody = {
      page,
      limit,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    TestValidator.equals(
      "pagination page",
      searchResult.pagination.current,
      page,
    );
    TestValidator.equals(
      "pagination limit",
      searchResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "pagination records greater or equal total",
      searchResult.pagination.records >= admins.length,
    );
    TestValidator.predicate(
      "pagination pages at least 1",
      searchResult.pagination.pages >= 1 ||
        searchResult.pagination.records === 0,
    );
    TestValidator.predicate(
      "page data length less or equal limit",
      searchResult.data.length <= limit,
    );
  }

  // Sorting by email ascending
  {
    const searchBody = {
      sort_by: "email",
      order: "asc",
      page: 1,
      limit: 20,
      is_active: true,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    for (let i = 1; i < searchResult.data.length; ++i) {
      TestValidator.predicate(
        `emails ascending order: index ${i - 1} <= ${i}`,
        searchResult.data[i - 1].email <= searchResult.data[i].email,
      );
    }
  }

  // Sorting by created_at descending
  {
    const searchBody = {
      sort_by: "created_at",
      order: "desc",
      page: 1,
      limit: 20,
    } satisfies IRedditCommunityAdmin.IRequest;

    const searchResult =
      await api.functional.redditCommunity.admin.redditCommunityAdmins.index(
        connection,
        { body: searchBody },
      );
    typia.assert(searchResult);

    for (let i = 1; i < searchResult.data.length; ++i) {
      TestValidator.predicate(
        `created_at descending order: index ${i - 1} >= ${i}`,
        searchResult.data[i - 1].created_at >= searchResult.data[i].created_at,
      );
    }
  }
}
