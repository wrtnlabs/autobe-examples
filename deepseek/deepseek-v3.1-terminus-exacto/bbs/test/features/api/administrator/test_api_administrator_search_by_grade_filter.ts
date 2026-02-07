import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator search functionality with basic pagination.
 * This test validates that an authenticated administrator can access the
 * administrator search endpoint and receive a paginated list of promotion approvals.
 * Since the request body schema is empty, no filtering parameters are available.
 */
export async function test_api_administrator_search_by_grade_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Call administrator search endpoint with empty request body
  const result =
    await api.functional.discussionBoard.admin.administrators.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  // Validate response structure
  typia.assert(result);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof result.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current",
    "current" in result.pagination,
  );
  TestValidator.predicate("pagination has limit", "limit" in result.pagination);
  TestValidator.predicate(
    "pagination has records",
    "records" in result.pagination,
  );
  TestValidator.predicate("pagination has pages", "pages" in result.pagination);
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // Validate individual records if any exist
  if (result.data.length > 0) {
    for (const record of result.data) {
      typia.assert(record);
      TestValidator.predicate("record has id", "id" in record);
      TestValidator.equals("id is uuid", typeof record.id, "string");
    }
  }
}
