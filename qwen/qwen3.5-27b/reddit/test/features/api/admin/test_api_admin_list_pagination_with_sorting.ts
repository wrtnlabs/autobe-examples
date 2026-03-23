import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdmin";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test admin list pagination with sorting functionality.
 *
 * This test validates:
 * 1. Pagination with customizable page size
 * 2. Sorting by username (ascending/descending)
 * 3. Sorting by created_at (ascending/descending)
 * 4. Date range filtering with created_after and created_before
 * 5. Pagination metadata accuracy across queries
 */
export async function test_api_admin_list_pagination_with_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create multiple test admin accounts with varying usernames and dates
  const testAdmins: IRedditCloneAdmin.IAuthorized[] = [];
  const now = new Date();
  for (let i = 0; i < 15; i++) {
    const tempConnection: api.IConnection = { host: connection.host };
    const testAdmin = await authorize_admin_join(tempConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: `admin_${String.fromCharCode(97 + i)}${RandomGenerator.alphabets(3)}`,
        displayName: RandomGenerator.name(),
        bio: null,
        avatar: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneAdmin.IJoin,
    });
    typia.assert(testAdmin);
    testAdmins.push(testAdmin);
  }
  // 3. Test pagination with page_size=10, sort_by='username', sort_direction='asc'
  const firstPageResponse = await api.functional.redditClone.admin.admins.index(
    adminConnection,
    {
      body: {
        page_size: 10,
        sort_by: "username",
        sort_direction: "asc",
      } satisfies IRedditCloneAdmin.IRequest,
    },
  );
  typia.assert(firstPageResponse);
  TestValidator.equals("first page size", firstPageResponse.data.length, 10);
  TestValidator.equals(
    "pagination current",
    firstPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    firstPageResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "first page has records",
    firstPageResponse.pagination.records >= 15,
  );
  // Verify ascending username sort order
  for (let i = 1; i < firstPageResponse.data.length; i++) {
    TestValidator.predicate(
      `username[${i - 1}] <= username[${i}]`,
      firstPageResponse.data[i - 1].username <=
        firstPageResponse.data[i].username,
    );
  }
  // 4. Test pagination with page=2, page_size=10
  const secondPageResponse =
    await api.functional.redditClone.admin.admins.index(adminConnection, {
      body: {
        page: 2,
        limit: 10,
        sort_by: "username",
        sort_direction: "asc",
      } satisfies IRedditCloneAdmin.IRequest,
    });
  typia.assert(secondPageResponse);
  TestValidator.equals("second page size", secondPageResponse.data.length, 5);
  TestValidator.equals(
    "second page current",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPageResponse.pagination.limit,
    10,
  );
  // Verify second page maintains sort order
  for (let i = 1; i < secondPageResponse.data.length; i++) {
    TestValidator.predicate(
      `page2 username[${i - 1}] <= username[${i}]`,
      secondPageResponse.data[i - 1].username <=
        secondPageResponse.data[i].username,
    );
  }
  // 5. Test sorting by created_at with sort_direction='desc'
  const newestFirstResponse =
    await api.functional.redditClone.admin.admins.index(adminConnection, {
      body: {
        page_size: 10,
        sort_by: "created_at",
        sort_direction: "desc",
      } satisfies IRedditCloneAdmin.IRequest,
    });
  typia.assert(newestFirstResponse);
  TestValidator.equals(
    "newest first page size",
    newestFirstResponse.data.length,
    10,
  );
  // Verify descending created_at sort order
  for (let i = 1; i < newestFirstResponse.data.length; i++) {
    TestValidator.predicate(
      `created_at[${i - 1}] >= created_at[${i}]`,
      new Date(newestFirstResponse.data[i - 1].created_at).getTime() >=
        new Date(newestFirstResponse.data[i].created_at).getTime(),
    );
  }
  // 6. Test date range filtering
  const oldestAdmin = testAdmins[0];
  const newestAdmin = testAdmins[testAdmins.length - 1];
  const dateFilteredResponse =
    await api.functional.redditClone.admin.admins.index(adminConnection, {
      body: {
        created_after: oldestAdmin.createdAt,
        created_before: newestAdmin.createdAt,
        page_size: 100,
      } satisfies IRedditCloneAdmin.IRequest,
    });
  typia.assert(dateFilteredResponse);
  // Verify all returned admins are within the date range
  for (const admin of dateFilteredResponse.data) {
    TestValidator.predicate(
      `admin created after filter`,
      new Date(admin.created_at).getTime() >=
        new Date(oldestAdmin.createdAt).getTime(),
    );
    TestValidator.predicate(
      `admin created before filter`,
      new Date(admin.created_at).getTime() <=
        new Date(newestAdmin.createdAt).getTime(),
    );
  }
  // 7. Test pagination metadata consistency
  TestValidator.equals(
    "total records consistent",
    firstPageResponse.pagination.records,
    secondPageResponse.pagination.records,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    firstPageResponse.pagination.pages ===
      Math.ceil(
        firstPageResponse.pagination.records /
          firstPageResponse.pagination.limit,
      ),
  );
}
