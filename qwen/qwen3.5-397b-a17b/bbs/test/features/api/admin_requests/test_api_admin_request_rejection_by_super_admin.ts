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
 * Test super administrator rejecting a pending administrator application request.
 *
 * This test validates the complete admin request rejection workflow:
 * 1. Super administrator account creation
 * 2. Member account creation and admin request submission
 * 3. Super administrator rejects the pending request
 * 4. Validates rejection response including status, timestamps, and administrator info
 */
export async function test_api_admin_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
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
  typia.assert(memberAuth);
  // 3. Member submits administrator request
  const reasonText = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 3,
    wordMax: 8,
  });
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: reasonText,
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Validate initial request state
  TestValidator.equals("initial status", adminRequest.status, "pending");
  TestValidator.equals("reason matches", adminRequest.reason, reasonText);
  TestValidator.equals("member matches", adminRequest.member.id, memberAuth.id);
  TestValidator.predicate(
    "admin is null while pending",
    adminRequest.admin === null,
  );
  TestValidator.predicate(
    "decided_at is null while pending",
    adminRequest.decided_at === null,
  );
  // 4. Super administrator rejects the pending request
  const rejectionResult =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(rejectionResult);
  // 5. Validate rejection response
  TestValidator.equals(
    "status changed to rejected",
    rejectionResult.status,
    "rejected",
  );
  TestValidator.equals("reason unchanged", rejectionResult.reason, reasonText);
  TestValidator.equals(
    "member unchanged",
    rejectionResult.member.id,
    memberAuth.id,
  );
  TestValidator.predicate(
    "decided_at is set",
    rejectionResult.decided_at !== null,
  );
  TestValidator.predicate(
    "admin is set after rejection",
    rejectionResult.admin !== null,
  );
  // 6. Validate administrator information in response
  if (rejectionResult.admin !== null) {
    TestValidator.equals(
      "rejecting admin id",
      rejectionResult.admin.id,
      adminAuth.id,
    );
    TestValidator.equals("admin grade", rejectionResult.admin.grade, "super");
  }
  // 7. Validate member information preserved
  TestValidator.equals(
    "member display name preserved",
    rejectionResult.member.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "member id preserved",
    rejectionResult.member.id,
    memberAuth.id,
  );
  // 8. Validate timestamps preserved
  TestValidator.predicate(
    "submitted_at is preserved",
    rejectionResult.submitted_at !== null,
  );
  TestValidator.predicate(
    "created_at is preserved",
    rejectionResult.created_at !== null,
  );
}
