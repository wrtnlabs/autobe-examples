import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_admin_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin account (regular grade by default)
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // Verify first admin is regular grade
  TestValidator.equals("first admin grade", admin1.grade, "regular");
  // 2. Create second admin account (also regular grade by default)
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // 3. Test filtering by grade 'regular'
  const regularFilterResult =
    await api.functional.discussionBoard.admin.admins.index(adminConnection1, {
      body: {
        grade: "regular",
        page: 1,
        limit: 20,
        sort: "created_at",
        direction: "desc",
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(regularFilterResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "regular filter has records",
    regularFilterResult.pagination.records >= 2,
  );
  TestValidator.equals(
    "regular filter current page",
    regularFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "regular filter limit valid",
    regularFilterResult.pagination.limit >= 20,
  );
  // Validate all returned admins have grade 'regular'
  TestValidator.predicate("all regular admins have correct grade", () =>
    regularFilterResult.data.every((admin) => admin.grade === "regular"),
  );
  // Verify at least our created admins are in the results
  const foundAdmin1 = regularFilterResult.data.find((a) => a.id === admin1.id);
  const foundAdmin2 = regularFilterResult.data.find((a) => a.id === admin2.id);
  TestValidator.predicate(
    "admin1 found in regular list",
    () => foundAdmin1 !== undefined,
  );
  TestValidator.predicate(
    "admin2 found in regular list",
    () => foundAdmin2 !== undefined,
  );
  // 4. Test filtering by grade 'super' (should return empty or only super admins)
  const superFilterResult =
    await api.functional.discussionBoard.admin.admins.index(adminConnection1, {
      body: {
        grade: "super",
        page: 1,
        limit: 20,
        sort: "created_at",
        direction: "desc",
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(superFilterResult);
  // Validate all returned admins have grade 'super' (or empty if no super admins exist)
  TestValidator.predicate("all super admins have correct grade", () =>
    superFilterResult.data.every((admin) => admin.grade === "super"),
  );
  // Validate pagination for super filter
  TestValidator.equals(
    "super filter current page",
    superFilterResult.pagination.current,
    1,
  );
  TestValidator.predicate("super filter pages calculated correctly", () => {
    const expectedPages = Math.ceil(
      superFilterResult.pagination.records / superFilterResult.pagination.limit,
    );
    return superFilterResult.pagination.pages === expectedPages;
  });
  // 5. Test edge case: filter with no results should return empty data array
  if (superFilterResult.pagination.records === 0) {
    TestValidator.equals(
      "super filter empty data array",
      superFilterResult.data.length,
      0,
    );
    TestValidator.equals(
      "super filter zero records",
      superFilterResult.pagination.records,
      0,
    );
    TestValidator.equals(
      "super filter zero pages",
      superFilterResult.pagination.pages,
      0,
    );
  }
  // 6. Test without grade filter (should return all grades)
  const allGradesResult =
    await api.functional.discussionBoard.admin.admins.index(adminConnection1, {
      body: {
        page: 1,
        limit: 20,
        sort: "created_at",
        direction: "desc",
      } satisfies IDiscussionBoardAdmin.IRequest,
    });
  typia.assert(allGradesResult);
  // Validate that all grades result has at least our 2 admins
  TestValidator.predicate(
    "all grades has at least 2 records",
    () => allGradesResult.pagination.records >= 2,
  );
  // Verify pagination is consistent
  TestValidator.equals(
    "all grades current page",
    allGradesResult.pagination.current,
    1,
  );
}
