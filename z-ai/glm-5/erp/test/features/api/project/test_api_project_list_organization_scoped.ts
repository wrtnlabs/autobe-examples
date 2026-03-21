import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can retrieve a paginated list of projects within their
 * organization context.
 *
 * Validates:
 * 1. Authentication via member join
 * 2. Organization-scoped project listing
 * 3. Pagination metadata correctness
 * 4. Default pagination values
 * 5. Empty data for new organization
 */
export async function test_api_project_list_organization_scoped(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account with first organization
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Request project list with default pagination (no filters)
  const result = await api.functional.erpHrm.member.projects.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmProject.IRequest,
    },
  );
  typia.assert(result);
  // 3. Validate pagination metadata structure and defaults
  TestValidator.equals("default page is 1", result.pagination.current, 1);
  TestValidator.predicate(
    "default limit is valid",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate("records count >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages count >= 0", result.pagination.pages >= 0);
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(result.data));
  // 5. For new organization, expect empty projects list
  TestValidator.equals(
    "empty data for new organization",
    result.data.length,
    0,
  );
  TestValidator.equals(
    "zero records for new organization",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero pages for new organization",
    result.pagination.pages,
    0,
  );
}
