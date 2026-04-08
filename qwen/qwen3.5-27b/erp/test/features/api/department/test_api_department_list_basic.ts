import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
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

/**
 * Test that an authenticated member can retrieve a paginated list of departments.
 *
 * Validates the complete department listing workflow including member authentication and paginated retrieval of department summaries. Ensures that the response contains proper pagination metadata and department information with hierarchical relationships preserved.
 *
 * Special attention is given to verifying that the pagination metadata is accurate, department summaries contain all required fields, and parent department references are correctly included for hierarchical display.
 *
 * 1. Member registers with email and password authentication.
 * 2. Member retrieves paginated list of departments with default parameters.
 * 3. Validates response contains pagination metadata (current page, limit, records, pages).
 * 4. Validates each department summary contains required fields (id, name, description, parent, created_at).
 * 5. Verifies hierarchical structure is preserved with parent department information.
 */
export async function test_api_department_list_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Retrieve paginated list of departments
  const request = {
    page: 1,
    limit: 20,
  } satisfies IHrmTimeTrackDepartment.IRequest;
  const response = await api.functional.hrmTimeTrack.member.departments.index(
    memberConnection,
    { body: request },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.equals("limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate department summaries
  await ArrayUtil.asyncForEach(response.data, async (department, index) => {
    typia.assert(department);
    // Validate required fields exist
    TestValidator.predicate(
      `department ${index} has valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        department.id,
      ),
    );
    TestValidator.predicate(
      `department ${index} has non-empty name`,
      department.name.length > 0,
    );
    TestValidator.predicate(
      `department ${index} has valid created_at`,
      !isNaN(Date.parse(department.created_at)),
    );
    // Validate hierarchical structure
    if (department.parent !== null) {
      typia.assert(department.parent);
      TestValidator.predicate(
        `department ${index} parent has valid UUID`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          department.parent.id,
        ),
      );
      TestValidator.predicate(
        `department ${index} parent has non-empty name`,
        department.parent.name.length > 0,
      );
    }
  });
  // 5. Verify pagination consistency
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "data length matches limit or records",
      response.data.length ===
        Math.min(response.pagination.limit, response.pagination.records),
    );
  }
}
