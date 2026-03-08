import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_member_admin_requests_create } from "../../../generate/generate_random_discussion_board_member_admin_requests_create";
import { prepare_random_discussion_board_admin_request } from "../../../prepare/prepare_random_discussion_board_admin_request";

/**
 * Test super administrator retrieves pending admin request details.
 * 1. Create super admin account
 * 2. Create member account
 * 3. Member submits admin request (pending status)
 * 4. Super admin logs in
 * 5. Super admin retrieves the request by ID
 * 6. Validate response contains member info, reason, pending status, null reviewer
 */
export async function test_api_admin_request_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: superAdminPassword,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const superAdminAuth = await api.functional.discussionBoard.auth.admin.join(
    connection,
    { body: superAdminJoinInput },
  );
  typia.assert(superAdminAuth);
  // 2. Create regular member account
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: memberPassword,
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  const memberAuth = await api.functional.discussionBoard.auth.member.join(
    connection,
    { body: memberJoinInput },
  );
  typia.assert(memberAuth);
  // 3. Create member connection and login
  const memberConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.member.login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Member submits administrator privilege request
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 5. Create super admin connection and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.login(superAdminConnection, {
    body: {
      email: superAdminAuth.email,
      password: superAdminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 6. Super admin retrieves the pending request
  const retrieved =
    await api.functional.discussionBoard.admin.admin_requests.at(
      superAdminConnection,
      { requestId: adminRequest.id },
    );
  typia.assert(retrieved);
  // 7. Validate response
  TestValidator.equals("request id matches", retrieved.id, adminRequest.id);
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("author id matches", retrieved.author.id, memberAuth.id);
  TestValidator.equals(
    "author display name matches",
    retrieved.author.displayName,
    memberAuth.displayName,
  );
  TestValidator.predicate(
    "reviewer is null for pending request",
    retrieved.reviewer === null,
  );
  TestValidator.predicate(
    "has submission timestamp",
    retrieved.submitted_at !== null,
  );
  TestValidator.predicate("has reason", retrieved.reason.length > 0);
}
