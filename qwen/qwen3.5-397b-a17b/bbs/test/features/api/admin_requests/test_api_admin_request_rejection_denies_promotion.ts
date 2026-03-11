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
 * Test the rejection success path where a super administrator rejects a pending administrator application request.
 *
 * This test verifies the complete admin request rejection workflow:
 * 1. Super administrator joins and authenticates
 * 2. Regular member joins and authenticates
 * 3. Member submits an administrator application request with valid reason
 * 4. Super administrator rejects the request by calling PUT with status 'rejected'
 * 5. Validates that the response shows rejected status and decided_at is populated
 * 6. Verifies the member remains at regular member level (not promoted to administrator)
 *
 * Key validations:
 * - Request status transitions from 'pending' to 'rejected'
 * - decided_at timestamp is set to the decision time
 * - admin field contains the super administrator's information
 * - Member's is_admin flag remains false (not promoted)
 */
export async function test_api_admin_request_rejection_denies_promotion(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for reuse in login
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  // 1. Super administrator setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(adminJoinResult);
  const adminLoginResult = await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminLoginResult);
  // Verify super admin has elevated privileges
  TestValidator.equals("admin grade is super", adminLoginResult.grade, "super");
  // Store member credentials for reuse in login
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardMember.IJoin;
  // 2. Regular member setup - join and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  typia.assert(memberJoinResult);
  const memberLoginResult = await authorize_member_login(memberConnection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(memberLoginResult);
  // 3. Member submits administrator application request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Verify initial request state
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "decided_at is null initially",
    adminRequest.decided_at === null,
  );
  TestValidator.equals("admin is null initially", adminRequest.admin, null);
  TestValidator.equals(
    "member id matches",
    adminRequest.member.id,
    memberLoginResult.id,
  );
  // 4. Super administrator rejects the admin request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      adminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "rejected",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection response
  TestValidator.equals(
    "status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "decided_at is now populated",
    rejectedRequest.decided_at !== null,
  );
  TestValidator.predicate(
    "admin is now populated",
    rejectedRequest.admin !== null,
  );
  TestValidator.equals(
    "admin id matches super admin",
    rejectedRequest.admin!.id,
    adminLoginResult.id,
  );
  TestValidator.equals(
    "admin grade is super",
    rejectedRequest.admin!.grade,
    "super",
  );
  TestValidator.equals(
    "member unchanged",
    rejectedRequest.member.id,
    memberLoginResult.id,
  );
  // 6. Verify member was NOT promoted - remains at regular member level
  // The member's is_admin flag should still be false after rejection
  TestValidator.equals(
    "member is_admin flag is false",
    rejectedRequest.member.is_admin,
    false,
  );
}
