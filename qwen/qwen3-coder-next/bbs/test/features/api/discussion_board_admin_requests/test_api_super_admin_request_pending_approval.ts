import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_super_admin_request_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super admin actor
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  const superAdminLogin = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: superAdmin.email,
        password: superAdminPassword,
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  // 2. Setup member actor
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  const memberLogin = await authorize_member_login(memberConnection, {
    body: {
      email: member.email,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLogin);
  // 3. Member creates administrator request
  const requestBefore =
    await generate_random_discussion_board_member_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
          status: "pending" as const,
        } satisfies IDiscussionBoardAdministratorRequest.ICreate,
      },
    );
  typia.assert(requestBefore);
  TestValidator.equals(
    "request status pending",
    requestBefore.status,
    "pending",
  );
  TestValidator.equals("request processor null", requestBefore.processor, null);
  // 4. Super admin retrieves pending request
  const retrievedPending =
    await api.functional.discussionBoard.superAdmin.requests.at(
      superAdminConnection,
      {
        requestId: requestBefore.id,
      },
    );
  typia.assert(retrievedPending);
  TestValidator.equals(
    "retrieved status pending",
    retrievedPending.status,
    "pending",
  );
  TestValidator.equals(
    "retrieved processor null",
    retrievedPending.processor,
    null,
  );
  TestValidator.equals(
    "request IDs match",
    retrievedPending.id,
    requestBefore.id,
  );
  // 5. Super admin approves the request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.requests.approve(
      superAdminConnection,
      {
        requestId: requestBefore.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("approved status", approvedRequest.status, "approved");
  // 6. Super admin retrieves approved request
  const retrievedApproved =
    await api.functional.discussionBoard.superAdmin.requests.at(
      superAdminConnection,
      {
        requestId: approvedRequest.id,
      },
    );
  typia.assert(retrievedApproved);
  // 7. Verify approved request details
  TestValidator.equals(
    "final status approved",
    retrievedApproved.status,
    "approved",
  );
  TestValidator.predicate(
    "processor exists after approval",
    () => retrievedApproved.processor !== null && retrievedApproved.processor !== undefined,
  );
  TestValidator.equals(
    "processor ID matches super admin",
    retrievedApproved.processor?.id,
    superAdminLogin.id,
  );
  TestValidator.predicate(
    "processed_at is set",
    () => retrievedApproved.processed_at !== null && retrievedApproved.processed_at !== undefined,
  );
  TestValidator.equals(
    "submitter unchanged",
    retrievedApproved.submitter.id,
    memberLogin.id,
  );
}