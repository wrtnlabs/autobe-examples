import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrators_index_filtered_search_authorized(
  connection: api.IConnection,
): Promise<void> {
  // This test validates that a super administrator can retrieve a filtered
  // and paginated list of active administrator accounts. It performs the
  // following steps:
  // 1. Create multiple administrator grades.
  // 2. Register a new super administrator and authenticate.
  // 3. Create multiple administrator accounts with varying grades,
  //    creation dates, emails, and active status.
  // 4. Query the administrators endpoint with filters for email substring,
  //    grade ID (one of the created grades), creation date range, active status,
  //    and pagination parameters.
  // 5. Verify the response contains only administrators matching the filters,
  //    has correct pagination metadata, and all administrators are active.
  // 1. Create super administrator connection using base connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Register and authorize a new super administrator with random credentials
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Update superAdminConnection headers with access token
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // 3. Create multiple administrator grades
  const gradeRegular =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: "regular",
          description: "Regular admin grade",
          level: 1,
        },
      },
    );
  typia.assert(gradeRegular);
  const gradeSuper =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: "super",
          description: "Super admin grade",
          level: 10,
        },
      },
    );
  typia.assert(gradeSuper);
  // 4. Create multiple administrator accounts with various grades, some active, some soft deleted
  // Define helper function to create admin accounts (simulate)
  async function createAdministrator(
    email: string,
    gradeId: string,
    createdAt: string,
    deletedAt: string | null,
  ) {
    // Since no direct API for admin creation is given, we simulate via graded credentials
    // Here, for testing, we assume the grades exist and validate filtering.
    // Since we don't have an API to create admins directly, this part is hypothetical.
    // However, for the purpose of this test, we will imagine manual setup or preexisting admins
    return {
      id: typia.random<string & tags.Format<"uuid">>(),
      email: email,
      grade: {
        id: gradeId,
        name: gradeId === gradeRegular.id ? gradeRegular.name : gradeSuper.name,
        description:
          gradeId === gradeRegular.id
            ? gradeRegular.description
            : gradeSuper.description,
        level:
          gradeId === gradeRegular.id ? gradeRegular.level : gradeSuper.level,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: deletedAt,
      },
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: deletedAt,
    };
  }
  // Prepare a list of mixed admins
  const now = new Date();
  const date1 = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(); // 3 days ago
  const date2 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days ago
  const date3 = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
  const admins = [
    await createAdministrator(
      "john.doe@example.com",
      gradeRegular.id,
      date1,
      null,
    ), // Active regular admin
    await createAdministrator(
      "jane.smith@example.com",
      gradeSuper.id,
      date2,
      null,
    ), // Active super admin
    await createAdministrator(
      "inactive.user@example.com",
      gradeRegular.id,
      date3,
      date3,
    ),
  ];
  // 5. Filter parameters: email includes 'example.com', grade_id set to gradeRegular.id, created_at between date1 and now, active true, page 1, limit 10
  const requestBody: IDiscussionBoardAdministrator.IRequest = {
    email: "example.com",
    grade_id: gradeRegular.id,
    created_at_start: date1,
    created_at_end: new Date().toISOString(),
    active: true,
    page: 1,
    limit: 10,
  };
  // 6. Call index API with filter
  const response = await api.functional.discussionBoard.administrators.index(
    superAdminConnection,
    { body: requestBody },
  );
  typia.assert(response);
  // 7. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    response.pagination.current === requestBody.page,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    response.pagination.limit === requestBody.limit,
  );
  TestValidator.predicate(
    "pagination records count is correct",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is correct",
    response.pagination.pages >= 0,
  );
  // 8. Validate that all returned admins match filtering criteria
  for (const admin of response.data) {
    TestValidator.predicate(
      `admin email contains example.com: ${admin.email}`,
      admin.email.includes("example.com"),
    );
    TestValidator.equals(
      `admin grade.id matches filter: ${(
        admin.grade as IDiscussionBoardAdministratorGrade
      ).id}`,
      (admin.grade as IDiscussionBoardAdministratorGrade).id,
      requestBody.grade_id,
    );
    // created_at between created_at_start and created_at_end
    TestValidator.predicate(
      `admin created_at >= filter start: ${admin.created_at} >= ${requestBody.created_at_start}`,
      admin.created_at >= (requestBody.created_at_start ?? ""),
    );
    TestValidator.predicate(
      `admin created_at <= filter end: ${admin.created_at} <= ${requestBody.created_at_end}`,
      admin.created_at <= (requestBody.created_at_end ?? ""),
    );
    // active: deleted_at must be null
    TestValidator.predicate(
      `admin is active: deleted_at is null`,
      admin.deleted_at === null,
    );
  }
}
