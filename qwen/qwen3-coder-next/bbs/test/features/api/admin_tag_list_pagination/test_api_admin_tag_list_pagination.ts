import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful retrieval of paginated tag list by an admin user.
 *
 * Tests the admin tags listing endpoint with default pagination parameters.
 * Validates that admin users can access the paginated tag list and that
 * the response structure matches the expected schema.
 */
export async function test_api_admin_tag_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate via utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Make paginated request to admin tags endpoint
  const output: IPageIDiscussionBoardTag.ISummary =
    await api.functional.discussionBoard.admin.tags.index(adminConnection);
  // 3. Validate complete response structure with typia.assert
  typia.assert(output);
  // 4. Validate pagination metadata is present and correct
  typia.assert(output.pagination);
  // 5. Validate data array exists (may be empty for new systems)
  if (output.data !== undefined) {
    typia.assert(output.data);
  }
}
