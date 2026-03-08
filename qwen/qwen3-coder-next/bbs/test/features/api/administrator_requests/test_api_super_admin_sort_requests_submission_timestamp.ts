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

export async function test_api_super_admin_sort_requests_submission_timestamp(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  typia.assert(superAdminConnection.headers?.Authorization);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: typia.random<IDiscussionBoardMember.IJoin>(),
  });
  typia.assert(memberUser);
  // 3. Create multiple administrator requests with different submission times
  const request1 = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: "First request - testing sorting",
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request1);
  // Wait 100ms to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const request2 = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: "Second request - testing sorting",
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request2);
  // Wait 100ms to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 100));
  const request3 = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: "Third request - testing sorting",
        status: "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request3);
  // 4. Test descending order (most recent first)
  const descendingResponse =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          sortBy: "submitted_at",
          sortOrder: "desc",
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(descendingResponse);
  // Verify descending order: newest first
  const descendingData = descendingResponse.data;
  TestValidator.equals(
    "descending order has 3 requests",
    descendingData.length,
    3,
  );
  TestValidator.equals(
    "descending order: first should be most recent",
    descendingData[0].submitted_at,
    request3.submitted_at,
  );
  TestValidator.equals(
    "descending order: second should be middle",
    descendingData[1].submitted_at,
    request2.submitted_at,
  );
  TestValidator.equals(
    "descending order: third should be oldest",
    descendingData[2].submitted_at,
    request1.submitted_at,
  );
  // 5. Test ascending order (oldest first)
  const ascendingResponse =
    await api.functional.discussionBoard.superAdmin.admin.requests.index(
      superAdminConnection,
      {
        body: {
          sortBy: "submitted_at",
          sortOrder: "asc",
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(ascendingResponse);
  // Verify ascending order: oldest first
  const ascendingData = ascendingResponse.data;
  TestValidator.equals(
    "ascending order has 3 requests",
    ascendingData.length,
    3,
  );
  TestValidator.equals(
    "ascending order: first should be oldest",
    ascendingData[0].submitted_at,
    request1.submitted_at,
  );
  TestValidator.equals(
    "ascending order: second should be middle",
    ascendingData[1].submitted_at,
    request2.submitted_at,
  );
  TestValidator.equals(
    "ascending order: third should be most recent",
    ascendingData[2].submitted_at,
    request3.submitted_at,
  );
}
