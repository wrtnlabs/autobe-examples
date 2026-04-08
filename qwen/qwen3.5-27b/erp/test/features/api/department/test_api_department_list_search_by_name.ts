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
 * Test department list search functionality with case-insensitive partial matching.
 *
 * Validates the department search feature by creating multiple departments with varied names and testing search queries. Ensures that the search parameter performs case-insensitive partial matching on department names, empty search returns all departments, and pagination works correctly when searching.
 *
 * Special attention is given to verifying that case-insensitive matching works (e.g., searching "SALES" finds "Sales Department"), partial name matching functions correctly, and the response includes only departments matching the search criteria with accurate pagination metadata.
 *
 * 1. Authenticate as a member to access the department listing endpoint.
 * 2. Create multiple departments with varied names for testing search functionality.
 * 3. Test empty search returns all created departments.
 * 4. Test case-insensitive search (uppercase query finds lowercase department names).
 * 5. Test partial name matching (substring query finds full department names).
 * 6. Validate pagination works correctly with search filters applied.
 */
export async function test_api_department_list_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create multiple departments with varied names
  const departments = await ArrayUtil.asyncRepeat(5, async (index) => {
    const name =
      index === 0
        ? "Sales Department"
        : index === 1
          ? "sales team"
          : index === 2
            ? "Marketing"
            : index === 3
              ? "marketing department"
              : "Engineering";
    return await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: name,
          description: `Description for ${name}`,
        },
      },
    );
  });
  await ArrayUtil.asyncForEach(departments, async (dept) => typia.assert(dept));
  // 3. Test empty search returns all departments
  const emptySearchResult =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          search: "",
          limit: 20,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(emptySearchResult);
  TestValidator.equals(
    "empty search returns all departments",
    emptySearchResult.data.length,
    departments.length,
  );
  TestValidator.equals(
    "empty search pagination records",
    emptySearchResult.pagination.records,
    departments.length,
  );
  // 4. Test case-insensitive search
  const caseInsensitiveResult =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          search: "SALES",
          limit: 20,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(caseInsensitiveResult);
  TestValidator.predicate(
    "case-insensitive search finds departments",
    caseInsensitiveResult.data.length >= 2,
  );
  await ArrayUtil.asyncForEach(caseInsensitiveResult.data, async (dept) => {
    TestValidator.predicate(
      "department name contains search term (case-insensitive)",
      dept.name.toLowerCase().includes("sales"),
    );
  });
  // 5. Test partial name matching
  const partialSearchResult =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          search: "marketing",
          limit: 20,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(partialSearchResult);
  TestValidator.predicate(
    "partial search finds marketing departments",
    partialSearchResult.data.length >= 2,
  );
  await ArrayUtil.asyncForEach(partialSearchResult.data, async (dept) => {
    TestValidator.predicate(
      "department name contains marketing",
      dept.name.toLowerCase().includes("marketing"),
    );
  });
  // 6. Test pagination with search
  const paginatedSearchResult =
    await api.functional.hrmTimeTrack.member.departments.index(
      memberConnection,
      {
        body: {
          search: "department",
          page: 1,
          limit: 1,
        } satisfies IHrmTimeTrackDepartment.IRequest,
      },
    );
  typia.assert(paginatedSearchResult);
  TestValidator.equals(
    "pagination limit respected",
    paginatedSearchResult.data.length,
    1,
  );
  TestValidator.equals(
    "pagination current page",
    paginatedSearchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit in metadata",
    paginatedSearchResult.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "pagination records count is accurate",
    paginatedSearchResult.pagination.records >= 2,
  );
}