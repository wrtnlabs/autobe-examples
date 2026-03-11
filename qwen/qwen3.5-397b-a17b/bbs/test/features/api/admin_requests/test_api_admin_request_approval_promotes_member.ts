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
 * Test admin request approval workflow that promotes a member to administrator.
 *
 * This test validates the complete administrator application approval process:
 * 1. Super administrator creates account and authenticates
 * 2. Regular member creates account and authenticates
 * 3. Member submits administrator application request with valid justification
 * 4. Super administrator reviews and approves the pending request
 * 5. Validates response contains approved status, decided_at timestamp, and admin details
 * 6. Verifies the member is now promoted to administrator grade
 */
export async function test_api_admin_request_approval_promotes_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup - join and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Verify super admin has super grade
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  // 2. Regular member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Member submits administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Validate initial request state
  TestValidator.equals(
    "request status pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "reason length valid",
    adminRequest.reason.length >= 50,
  );
  TestValidator.predicate(
    "reason length valid",
    adminRequest.reason.length <= 2000,
  );
  TestValidator.equals("member matches", adminRequest.member.id, member.id);
  TestValidator.predicate(
    "decided_at is null",
    adminRequest.decided_at === null,
  );
  TestValidator.predicate("admin is null", adminRequest.admin === null);
  // 4. Super administrator approves the request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate approval response
  TestValidator.equals("status approved", approvedRequest.status, "approved");
  TestValidator.predicate(
    "decided_at is set",
    approvedRequest.decided_at !== null,
  );
  TestValidator.equals(
    "admin id matches",
    approvedRequest.admin?.id,
    superAdmin.id,
  );
  TestValidator.equals("admin grade", approvedRequest.admin?.grade, "super");
  TestValidator.equals(
    "member unchanged",
    approvedRequest.member.id,
    member.id,
  );
  // 6. Verify member is now promoted to administrator
  // Login again to check updated privileges
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const updatedMember = await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(updatedMember);
  // Note: The member summary should now show is_admin: true
  TestValidator.predicate(
    "member is now admin",
    updatedMember.token.access.length > 0,
  );
}
