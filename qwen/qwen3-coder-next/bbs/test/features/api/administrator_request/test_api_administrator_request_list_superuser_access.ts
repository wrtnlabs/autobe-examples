import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_administrator_request_list_superuser_access(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create multiple member users who will submit administrator requests
  const memberCount = 5;
  const memberConnections: api.IConnection[] = [];
  const memberRequests: IDiscussionBoardAdministratorRequest.ICreate[] = [];
  for (let i = 0; i < memberCount; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberConnections.push(memberConnection);
    memberRequests.push({
      reason: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 10,
        wordMax: 20,
      }),
      status: "pending",
    } satisfies IDiscussionBoardAdministratorRequest.ICreate);
  }
  // Submit administrator requests from members
  const requests: IDiscussionBoardAdministratorRequest[] = [];
  for (let i = 0; i < memberCount; i++) {
    const request =
      await generate_random_discussion_board_member_requests_create(
        memberConnections[i],
        { body: memberRequests[i] },
      );
    requests.push(request);
    typia.assert(request);
  }
  // Get pending requests through super admin with descending sort
  const descendingRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sortBy: "submitted_at",
          sortOrder: "desc",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(descendingRequests);
  // Verify pagination structure
  TestValidator.equals(
    "page number is 1",
    descendingRequests.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches",
    descendingRequests.pagination.limit,
    10,
  );
  TestValidator.equals(
    "records count",
    descendingRequests.pagination.records,
    memberCount,
  );
  TestValidator.equals(
    "request count",
    descendingRequests.data.length,
    memberCount,
  );
  // Verify each request summary contains required fields
  for (const request of descendingRequests.data) {
    TestValidator.equals("status is pending", request.status, "pending");
    TestValidator.predicate(
      "has submitted_at",
      request.submitted_at !== undefined,
    );
    TestValidator.equals(
      "rejection_reason is null",
      request.rejection_reason,
      null,
    );
  }
  // Test cursor-based pagination - retrieve next page should be empty
  const lastRequest =
    descendingRequests.data[descendingRequests.data.length - 1];
  const nextPage =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sortBy: "submitted_at",
          sortOrder: "desc",
          cursor: lastRequest.submitted_at,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(nextPage);
  TestValidator.equals("next page is empty", nextPage.data.length, 0);
  // Test ascending sort order
  const ascendingRequests =
    await api.functional.discussionBoard.admin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          sortBy: "submitted_at",
          sortOrder: "asc",
          limit: 10,
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(ascendingRequests);
  TestValidator.equals(
    "ascending request count",
    ascendingRequests.data.length,
    memberCount,
  );
}
