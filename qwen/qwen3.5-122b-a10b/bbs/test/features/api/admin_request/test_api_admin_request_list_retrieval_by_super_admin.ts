import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test super administrator retrieves paginated list of admin privilege requests.
 * 1. Super admin authenticates via authorize_admin_join
 * 2. Request admin request list with default pagination
 * 3. Validate response structure and pagination metadata
 * 4. Validate request summary fields
 */
export async function test_api_admin_request_list_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Retrieve admin request list with default pagination
  const requestList =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardAdminRequest.IRequest,
      },
    );
  typia.assert(requestList);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page is 1",
    requestList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    requestList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    requestList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    requestList.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  if (requestList.data.length > 0) {
    const firstRequest = requestList.data[0];
    typia.assert(firstRequest);
    // Validate business logic - reason must be non-empty
    TestValidator.predicate(
      "request has reason",
      firstRequest.reason.length > 0,
    );
    // Validate business logic - status must be one of the valid values
    TestValidator.predicate(
      "request has valid status",
      ["pending", "approved", "rejected"].includes(firstRequest.status),
    );
    // Validate member summary exists with required fields
    TestValidator.predicate(
      "member has valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstRequest.discussion_board_member.id,
      ),
    );
    TestValidator.predicate(
      "member has article count",
      firstRequest.discussion_board_member.articleCount >= 0,
    );
    TestValidator.predicate(
      "member has comment count",
      firstRequest.discussion_board_member.commentCount >= 0,
    );
    // Validate reviewer (may be null for pending requests)
    if (firstRequest.status !== "pending") {
      TestValidator.predicate(
        "reviewed request has admin reviewer",
        firstRequest.discussion_board_admin !== null,
      );
      if (
        firstRequest.discussion_board_admin !== null &&
        firstRequest.reviewed_at !== null
      ) {
        TestValidator.predicate(
          "reviewed_at is set for reviewed request",
          firstRequest.reviewed_at.length > 0,
        );
      }
    }
  }
}
