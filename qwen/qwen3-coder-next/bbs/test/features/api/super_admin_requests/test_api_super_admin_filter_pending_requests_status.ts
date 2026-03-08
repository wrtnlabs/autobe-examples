import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_requests_create } from "../../../generate/generate_random_discussion_board_member_requests_create";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

export async function test_api_super_admin_filter_pending_requests_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin user with known credentials
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create regular members who will submit administrator requests
  const memberConnections: api.IConnection[] = [];
  const memberEmails: string[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const memberEmail = typia.random<string & tags.Format<"email">>();
    memberEmails.push(memberEmail);
    await authorize_member_join(memberConnection, {
      body: {
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    memberConnections.push(memberConnection);
  }
  // 3. Create administrator requests with different statuses
  // Create 3 pending requests
  const pendingRequests: IDiscussionBoardAdministratorRequest[] = [];
  for (let i = 0; i < 3; i++) {
    const request = await api.functional.discussionBoard.member.requests.create(
      memberConnections[i],
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          status:
            "pending" satisfies IDiscussionBoardAdministratorRequest.ICreate["status"],
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
      },
    );
    typia.assert(request);
    pendingRequests.push(request);
  }
  // Create 2 requests that will be approved (first create as pending, then approve)
  const approvedRequests: IDiscussionBoardAdministratorRequest[] = [];
  for (let i = 3; i < 5; i++) {
    const request = await api.functional.discussionBoard.member.requests.create(
      memberConnections[i],
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          status:
            "pending" satisfies IDiscussionBoardAdministratorRequest.ICreate["status"],
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
      },
    );
    typia.assert(request);
    approvedRequests.push(request);
  }
  // 4. Test: Filter for pending requests as super admin
  const pendingFilterConnection: api.IConnection = { host: connection.host };
  // Login as super admin using the credentials from step 1
  await authorize_super_admin_login(pendingFilterConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const pendingResult =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      pendingFilterConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingResult);
  // 5. Validate: Only pending requests should be returned
  TestValidator.equals(
    "pending filter returns only pending requests",
    pendingResult.data.every((r) => r.status === "pending"),
    true,
  );
  // 6. Validate: All pending requests should be in the result
  const pendingIds = pendingRequests.map((req) => req.submitter.id);
  pendingRequests.forEach((req) => {
    TestValidator.predicate(
      "pending request is in filtered results",
      pendingIds.includes(req.submitter.id),
    );
  });
  // 7. Validate: No filter returns all requests
  const noFilterConnection: api.IConnection = { host: connection.host };
  // Login as super admin again
  await authorize_super_admin_login(noFilterConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const allResult =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      noFilterConnection,
      {
        body: {
          // No status filter - should return all requests
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(allResult);
  // 8. Validate: Pagination information is correct
  TestValidator.predicate(
    "pagination has valid structure",
    typeof pendingResult.pagination.current === "number" &&
      pendingResult.pagination.current >= 0 &&
      typeof pendingResult.pagination.limit === "number" &&
      pendingResult.pagination.limit >= 0 &&
      typeof pendingResult.pagination.records === "number" &&
      pendingResult.pagination.records >= 0 &&
      typeof pendingResult.pagination.pages === "number" &&
      pendingResult.pagination.pages >= 0,
  );
  // 9. Validate: Response matches expected structure
  TestValidator.equals(
    "response data structure",
    typeof pendingResult.data[0]?.status,
    "string",
  );
  TestValidator.equals(
    "response submitter structure",
    typeof pendingRequests[0]?.submitter.id,
    "string",
  );
}