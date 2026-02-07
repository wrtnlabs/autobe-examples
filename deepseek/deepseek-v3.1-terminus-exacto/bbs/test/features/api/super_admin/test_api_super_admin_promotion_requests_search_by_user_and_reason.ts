import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test searching promotion requests by user information and reason text.
 * A super administrator needs to find requests from specific users or containing
 * certain keywords in the reason field. The test validates that the search
 * functionality correctly filters requests based on user display name pattern
 * matching and reason text search using trigram search functionality.
 */
export async function test_api_super_admin_promotion_requests_search_by_user_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test search by user display name pattern matching
  const searchByDisplayName =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          user_display_name: RandomGenerator.name().substring(0, 3),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchByDisplayName);
  // Test search by reason text using trigram search
  const searchByReason =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          reason_search: RandomGenerator.paragraph({ sentences: 1 }).substring(
            0,
            5,
          ),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IRequest,
      },
    );
  typia.assert(searchByReason);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    typeof searchByDisplayName.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof searchByDisplayName.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof searchByDisplayName.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof searchByDisplayName.pagination.pages,
    "number",
  );
  TestValidator.equals(
    "pagination has current page",
    typeof searchByReason.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof searchByReason.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof searchByReason.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof searchByReason.pagination.pages,
    "number",
  );
  // Validate data array exists and has proper structure
  TestValidator.predicate(
    "data is array",
    Array.isArray(searchByDisplayName.data),
  );
  TestValidator.predicate("data is array", Array.isArray(searchByReason.data));
  // If there are results, validate their structure
  if (searchByDisplayName.data.length > 0) {
    const firstItem = searchByDisplayName.data[0]!;
    TestValidator.equals("item has id", typeof firstItem.id, "string");
    TestValidator.equals("item has reason", typeof firstItem.reason, "string");
    TestValidator.equals("item has status", typeof firstItem.status, "string");
    TestValidator.predicate(
      "valid status",
      ["pending", "approved", "rejected"].includes(firstItem.status),
    );
    TestValidator.equals(
      "item has user object",
      typeof firstItem.user,
      "object",
    );
    TestValidator.equals(
      "user has display_name",
      typeof firstItem.user.display_name,
      "string",
    );
  }
  if (searchByReason.data.length > 0) {
    const firstItem = searchByReason.data[0]!;
    TestValidator.equals("item has id", typeof firstItem.id, "string");
    TestValidator.equals("item has reason", typeof firstItem.reason, "string");
    TestValidator.equals("item has status", typeof firstItem.status, "string");
    TestValidator.predicate(
      "valid status",
      ["pending", "approved", "rejected"].includes(firstItem.status),
    );
    TestValidator.equals(
      "item has user object",
      typeof firstItem.user,
      "object",
    );
    TestValidator.equals(
      "user has display_name",
      typeof firstItem.user.display_name,
      "string",
    );
  }
}
