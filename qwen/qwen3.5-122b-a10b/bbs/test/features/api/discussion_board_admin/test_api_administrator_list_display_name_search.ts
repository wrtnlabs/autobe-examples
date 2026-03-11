import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test trigram-based display name search functionality for discussion board administrators.
 *
 * A super administrator authenticates and searches for administrators using partial display name matching.
 * Test cases include:
 * 1. Searching with a substring that matches multiple administrators
 * 2. Searching with a substring that matches no administrators (empty result)
 * 3. Searching with exact display name match
 *
 * Verifies that the trigram fuzzy search correctly returns administrators whose display names contain the search term,
 * demonstrating the GIN index-based search capability for efficient administrator discovery.
 */
export async function test_api_administrator_list_display_name_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      display_name: "Super Administrator",
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create multiple administrators with distinct display names
  const admin1 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: "John Admin",
        grade: "regular",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin1);
  const admin2 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: "Jane Moderator",
        grade: "regular",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin2);
  const admin3 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: "Bob SuperAdmin",
        grade: "regular",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin3);
  const admin4 = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        display_name: "Alice Support",
        grade: "regular",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin4);
  // 3. Test Case 1: Search with substring matching multiple administrators
  const multipleMatchResult = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "Admin",
        limit: 100,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(multipleMatchResult);
  TestValidator.equals(
    "multiple match search returns correct count",
    multipleMatchResult.data.length,
    3,
  );
  const adminNames = multipleMatchResult.data.map((a) => a.display_name);
  TestValidator.predicate(
    "John Admin found in multiple match",
    adminNames.includes("John Admin"),
  );
  TestValidator.predicate(
    "Super Administrator found in multiple match",
    adminNames.includes("Super Administrator"),
  );
  TestValidator.predicate(
    "Bob SuperAdmin found in multiple match",
    adminNames.includes("Bob SuperAdmin"),
  );
  // 4. Test Case 2: Search with substring matching no administrators (empty result)
  const noMatchResult = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "ZzzzzzUniqueNonExistent",
        limit: 100,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchResult.data.length,
    0,
  );
  // 5. Test Case 3: Search with exact display name match
  const exactMatchResult = await api.functional.discussionBoard.admins.index(
    adminConnection,
    {
      body: {
        search: "Jane Moderator",
        limit: 100,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(exactMatchResult);
  TestValidator.equals(
    "exact match search returns single result",
    exactMatchResult.data.length,
    1,
  );
  TestValidator.equals(
    "exact match returns correct admin",
    exactMatchResult.data[0].display_name,
    "Jane Moderator",
  );
}
