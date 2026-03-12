import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_list_search_by_email_and_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_administrator_join(adminConnection, {
    body: {
      email: "admin1@test.com",
      password: "password123",
      display_name: "Admin User One",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(admin1);
  // Create second administrator for testing search
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(adminConnection2, {
    body: {
      email: "admin2@test.com",
      password: "password123",
      display_name: "Admin User Two",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(admin2);
  // Create third administrator with different display name pattern
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_administrator_join(adminConnection3, {
    body: {
      email: "john.doe@test.com",
      password: "password123",
      display_name: "John Doe",
      href: "https://test.com",
      referrer: "https://test.com",
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  typia.assert(admin3);
  // 2. Test search by email
  const searchByEmailResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        search: "admin1@test.com",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(searchByEmailResult);
  TestValidator.equals(
    "search by email returns matching administrator",
    searchByEmailResult.data.length,
    1,
  );
  TestValidator.predicate(
    "search by email returns correct administrator",
    searchByEmailResult.data[0].email === "admin1@test.com",
  );
  // 3. Test search by display_name
  const searchByDisplayNameResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        search: "John Doe",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(searchByDisplayNameResult);
  TestValidator.equals(
    "search by display_name returns matching administrator",
    searchByDisplayNameResult.data.length,
    1,
  );
  TestValidator.predicate(
    "search by display_name returns correct administrator",
    searchByDisplayNameResult.data[0].display_name === "John Doe",
  );
  // 4. Test case-insensitive search
  const caseInsensitiveResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        search: "ADMIN USER ONE",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive search returns results",
    caseInsensitiveResult.data.length > 0,
  );
  // 5. Test empty results with non-matching search term
  const emptySearchResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        search: "nonexistent_admin_xyz",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns zero records",
    emptySearchResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination records is zero",
    emptySearchResult.pagination.records,
    0,
  );
  // 6. Test combined filters (search + grade)
  const combinedFilterResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        search: "admin",
        grade: "regular",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filters return administrators matching both criteria",
    combinedFilterResult.data.every(
      (admin) =>
        (admin.email.includes("admin") ||
          (admin.display_name && admin.display_name.includes("admin"))) &&
        admin.grade === "regular",
    ),
  );
  // 7. Test sorting by email ascending
  const sortByEmailResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        sortBy: "email",
        sortOrder: "asc",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(sortByEmailResult);
  TestValidator.predicate(
    "results sorted by email ascending",
    sortByEmailResult.data.every((admin, index, array) => {
      if (index === 0) return true;
      return array[index - 1].email <= admin.email;
    }),
  );
  // 8. Test sorting by created_at descending
  const sortByCreatedAtResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        sortBy: "created_at",
        sortOrder: "desc",
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(sortByCreatedAtResult);
  TestValidator.predicate(
    "results sorted by created_at descending",
    sortByCreatedAtResult.data.every((admin, index, array) => {
      if (index === 0) return true;
      return (
        new Date(array[index - 1].created_at) >= new Date(admin.created_at)
      );
    }),
  );
}
