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

export async function test_api_promotion_approval_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
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
  // Test pagination with empty request body
  const response =
    await api.functional.discussionBoard.admin.promotion_approvals.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.equals(
    "pagination structure exists",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Test pagination calculations
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation correct",
    response.pagination.pages,
    expectedPages,
  );
  // Test data array structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate data items have correct structure when present
  if (response.data.length > 0) {
    const firstItem = response.data[0];
    typia.assert(firstItem);
    TestValidator.predicate(
      "first item has uuid id",
      typeof firstItem.id === "string" && firstItem.id.length > 0,
    );
  }
  // Validate data array length matches pagination limit (or total records on last page)
  if (
    response.pagination.pages > 0 &&
    response.pagination.current < response.pagination.pages
  ) {
    TestValidator.equals(
      "data length matches limit on non-last page",
      response.data.length,
      response.pagination.limit,
    );
  } else if (
    response.pagination.pages > 0 &&
    response.pagination.current === response.pagination.pages
  ) {
    // Last page should have remaining records
    const expectedRemaining =
      response.pagination.records % response.pagination.limit;
    const expectedLength =
      expectedRemaining === 0 ? response.pagination.limit : expectedRemaining;
    TestValidator.equals(
      "data length matches remaining records on last page",
      response.data.length,
      expectedLength,
    );
  }
}
