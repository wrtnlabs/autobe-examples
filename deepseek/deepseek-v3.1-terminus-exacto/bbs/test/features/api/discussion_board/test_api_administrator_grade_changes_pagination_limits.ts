import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorGradeChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_grade_changes_pagination_limits(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Valid pagination parameters (page 1, limit 10)
  const response1 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId: admin.id,
        body: {
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response1);
  // Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", response1.pagination.limit, 10);
  TestValidator.predicate(
    "records should be non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages should be non-negative",
    response1.pagination.pages >= 0,
  );
  // Test 2: Maximum limit (100)
  const response2 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId: admin.id,
        body: {
          limit: 100 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response2);
  TestValidator.equals(
    "maximum limit should be 100",
    response2.pagination.limit,
    100,
  );
  // Test 3: Minimum limit (1)
  const response3 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId: admin.id,
        body: {
          limit: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response3);
  TestValidator.equals(
    "minimum limit should be 1",
    response3.pagination.limit,
    1,
  );
  // Test 4: Different page numbers with valid limits
  const response4 =
    await api.functional.discussionBoard.admin.administrators.grade_changes.index(
      adminConnection,
      {
        administratorId: admin.id,
        body: {
          page: 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 25 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
      },
    );
  typia.assert(response4);
  TestValidator.equals(
    "page 2 should have current page 2",
    response4.pagination.current,
    2,
  );
  // Test 5: Pagination calculation accuracy
  const expectedPages = Math.ceil(
    response1.pagination.records / response1.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation should be accurate",
    response1.pagination.pages,
    expectedPages,
  );
  // Test 6: Empty page beyond total records (using valid page number)
  if (response1.pagination.pages > 0) {
    const emptyPage = response1.pagination.pages + 1;
    const response6 =
      await api.functional.discussionBoard.admin.administrators.grade_changes.index(
        adminConnection,
        {
          administratorId: admin.id,
          body: {
            page: emptyPage satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1>,
            limit: 10 satisfies number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardAdministratorGradeChange.IRequest,
        },
      );
    typia.assert(response6);
    TestValidator.equals(
      "empty page should have empty data array",
      response6.data.length,
      0,
    );
    TestValidator.equals(
      "current page should match requested page",
      response6.pagination.current,
      emptyPage,
    );
  }
}
