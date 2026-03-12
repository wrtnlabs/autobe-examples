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

/**
 * Test filtering administrator list by grade (regular vs super).
 *
 * This test validates that the administrator list endpoint correctly filters
 * administrators by their grade level ('regular' or 'super') and returns
 * accurate pagination counts for each filter combination.
 */
export async function test_api_administrator_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Test filtering by grade='regular'
  const regularResult =
    await api.functional.discussionBoard.administrators.index(adminConnection, {
      body: {
        grade: "regular",
        limit: 100,
      } satisfies IDiscussionBoardAdministrator.IRequest,
    });
  typia.assert(regularResult);
  // Verify all returned administrators have grade='regular'
  for (const admin of regularResult.data) {
    TestValidator.equals(
      `administrator ${admin.id} has grade 'regular'`,
      admin.grade,
      "regular",
    );
  }
  // Verify pagination count
  TestValidator.equals(
    "regular grade count matches pagination",
    regularResult.data.length,
    Math.min(regularResult.pagination.records, regularResult.pagination.limit),
  );
  // 3. Test filtering by grade='super'
  const superResult = await api.functional.discussionBoard.administrators.index(
    adminConnection,
    {
      body: {
        grade: "super",
        limit: 100,
      } satisfies IDiscussionBoardAdministrator.IRequest,
    },
  );
  typia.assert(superResult);
  // Verify all returned administrators have grade='super'
  for (const admin of superResult.data) {
    TestValidator.equals(
      `administrator ${admin.id} has grade 'super'`,
      admin.grade,
      "super",
    );
  }
  // Verify pagination count
  TestValidator.equals(
    "super grade count matches pagination",
    superResult.data.length,
    Math.min(superResult.pagination.records, superResult.pagination.limit),
  );
  // 4. Test without grade filter (should return all)
  const allResult = await api.functional.discussionBoard.administrators.index(
    adminConnection,
    {
      body: {
        limit: 100,
      } satisfies IDiscussionBoardAdministrator.IRequest,
    },
  );
  typia.assert(allResult);
  // Verify that all administrators (both regular and super) are returned
  const hasRegular = ArrayUtil.has(
    allResult.data,
    (admin) => admin.grade === "regular",
  );
  const hasSuper = ArrayUtil.has(
    allResult.data,
    (admin) => admin.grade === "super",
  );
  TestValidator.predicate(
    "unfiltered result contains regular administrators",
    hasRegular || regularResult.pagination.records === 0,
  );
  TestValidator.predicate(
    "unfiltered result contains super administrators",
    hasSuper || superResult.pagination.records === 0,
  );
  // Verify total count matches sum of filtered counts
  TestValidator.equals(
    "total count equals sum of regular and super counts",
    allResult.pagination.records,
    regularResult.pagination.records + superResult.pagination.records,
  );
}
