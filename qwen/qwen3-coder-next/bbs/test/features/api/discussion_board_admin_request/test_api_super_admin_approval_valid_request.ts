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

export async function test_api_super_admin_approval_valid_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin actor
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
  // 2. Create member actor
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Member submits administrator request
  const request = await api.functional.discussionBoard.member.requests.create(
    memberConnection,
    {
      body: {
        reason: RandomGenerator.paragraph({ sentences: 5 }),
        status: "pending" satisfies "pending",
      } satisfies IDiscussionBoardAdministratorRequest.ICreate,
    },
  );
  typia.assert(request);
  TestValidator.equals("request status is pending", request.status, "pending");
  // 4. Super admin retrieves pending requests to verify request exists
  const pendingResponse =
    await api.functional.discussionBoard.superAdmin.requests.pending.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
        } satisfies IDiscussionBoardAdministratorRequest.IRequest,
      },
    );
  typia.assert(pendingResponse);
  TestValidator.predicate("pending request exists", () =>
    pendingResponse.data.length > 0,
  );
  // 5. Super admin approves the request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.requests.approve(
      superAdminConnection,
      {
        requestId: request.id,
      },
    );
  typia.assert(approvedRequest);
  // 6. Validate approval response
  TestValidator.equals(
    "request status changed to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "processed_at timestamp is set",
    () =>
      approvedRequest.processed_at !== null &&
      approvedRequest.processed_at !== undefined,
  );
  TestValidator.predicate(
    "processor field contains super admin summary",
    () =>
      approvedRequest.processor !== null &&
      approvedRequest.processor !== undefined &&
      typeof approvedRequest.processor.id === "string" &&
      typeof approvedRequest.processor.email === "string" &&
      typeof approvedRequest.processor.display_name === "string",
  );
}