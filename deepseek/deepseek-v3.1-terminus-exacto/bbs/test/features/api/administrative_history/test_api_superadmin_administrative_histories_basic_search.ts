import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrativeHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator administrative history search functionality with basic pagination.
 *
 * Verifies that super administrators can search administrative history records
 * with default pagination parameters and validate the response structure.
 */
export async function test_api_superadmin_administrative_histories_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Perform basic search with default pagination
  const searchResponse =
    await api.functional.discussionBoard.superAdmin.administrative_histories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAdministrativeHistory.IRequest,
      },
    );
  typia.assert(searchResponse);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", searchResponse.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records non-negative",
    searchResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    searchResponse.pagination.pages >= 0,
  );
  // 4. Validate data structure for each administrative history record
  for (const history of searchResponse.data) {
    typia.assert(history);
    // typia.assert() has already validated all field types and formats
    // No additional type validation needed
  }
  // 5. Validate pagination calculation
  const expectedPages = Math.ceil(
    searchResponse.pagination.records / searchResponse.pagination.limit,
  );
  TestValidator.equals(
    "pagination pages calculation",
    searchResponse.pagination.pages,
    expectedPages,
  );
}
