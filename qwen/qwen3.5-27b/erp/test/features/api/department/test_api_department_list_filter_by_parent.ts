import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";

/**
 * Test department list filtering by parent department for hierarchical navigation.
 *
 * Validates the complete department hierarchy filtering workflow including member authentication, department creation with parent-child relationships, and filtering by parent_department_id. Ensures that the filter correctly returns only top-level departments when null, only child departments when a parent UUID is specified, and properly displays hierarchical relationships in the response.
 *
 * Special attention is given to verifying that the parent_department_id filter parameter works correctly for both null (top-level) and UUID (child) values, that pagination functions properly with filters, and that empty results are returned when no child departments exist.
 *
 * 1. Member authenticates via join endpoint.
 * 2. Parent department created with parent_department_id = null (top-level).
 * 3. Multiple child departments created under the parent.
 * 4. Filter by parent_department_id = null returns only top-level departments.
 * 5. Filter by parent_department_id = parent.id returns only child departments.
 * 6. Verify hierarchical relationships (parent field) in response.
 * 7. Test pagination with filter applied.
 * 8. Test filtering by department with no children returns empty results.
 */
export async function test_api_department_list_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create parent department (top-level)
  const parentDepartment: IHrmTimeTrackDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Parent Department - " + RandomGenerator.alphabets(8),
          description: "Top-level department for testing hierarchy",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 3. Create multiple child departments under the parent
  const childDepartments: IHrmTimeTrackDepartment[] =
    await ArrayUtil.asyncRepeat(3, async (index: number) => {
      const child: IHrmTimeTrackDepartment =
        await generate_random_hrm_time_track_member_departments_create(
          memberConnection,
          {
            body: {
              name: `Child Department ${index + 1} - ${RandomGenerator.alphabets(6)}`,
              description: `Child department ${index + 1} of parent`,
              parent_department_id: parentDepartment.id,
            } satisfies IHrmTimeTrackDepartment.ICreate,
          },
        );
      typia.assert(child);
      return child;
    });
  // 4. Create another top-level department to test null filter
  const anotherTopLevel: IHrmTimeTrackDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Another Top-Level - " + RandomGenerator.alphabets(8),
          description: "Another top-level department",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(anotherTopLevel);
  // 5. Test filtering by parent_department_id = null (top-level only)
  const topLevelResult: IPageIHrmTimeTrackDepartment.ISummary =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: null,
          limit: 10,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(topLevelResult);
  TestValidator.equals(
    "top-level filter returns correct count",
    topLevelResult.data.length,
    2,
  );
  TestValidator.predicate(
    "all top-level departments have no parent",
    topLevelResult.data.every((dept) => dept.parent === null),
  );
  TestValidator.predicate(
    "parent department in top-level results",
    topLevelResult.data.some((dept) => dept.id === parentDepartment.id),
  );
  TestValidator.predicate(
    "another top-level in results",
    topLevelResult.data.some((dept) => dept.id === anotherTopLevel.id),
  );
  // 6. Test filtering by parent_department_id = parent.id (child departments only)
  const childResult: IPageIHrmTimeTrackDepartment.ISummary =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: parentDepartment.id,
          limit: 10,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(childResult);
  TestValidator.equals(
    "child filter returns correct count",
    childResult.data.length,
    3,
  );
  TestValidator.predicate(
    "all child departments have correct parent",
    childResult.data.every(
      (dept) => dept.parent !== null && dept.parent.id === parentDepartment.id,
    ),
  );
  TestValidator.predicate(
    "all created children in results",
    childDepartments.every((child) =>
      childResult.data.some((dept) => dept.id === child.id),
    ),
  );
  // 7. Test pagination with filter
  const paginatedResult: IPageIHrmTimeTrackDepartment.ISummary =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: parentDepartment.id,
          page: 1,
          limit: 2,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedResult.data.length,
    2,
  );
  TestValidator.equals(
    "pagination metadata correct",
    paginatedResult.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    paginatedResult.pagination.pages,
    2,
  );
  // 8. Test filtering by department with no children (empty result)
  const emptyResult: IPageIHrmTimeTrackDepartment.ISummary =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          parent_department_id: childDepartments[0].id,
          limit: 10,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "filter by leaf department returns empty",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result pagination records",
    emptyResult.pagination.records,
    0,
  );
}
