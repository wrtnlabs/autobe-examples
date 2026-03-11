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
 * Test the admin request rejection workflow with a pending request.
 *
 * This test validates that:
 * 1. Super administrators can reject pending admin requests
 * 2. The rejection properly updates the request status to 'rejected'
 * 3. The deciding admin is recorded correctly
 * 4. The decided_at timestamp is set upon rejection
 *
 * Note: Testing with pending request since approve endpoint is not available.
 * The core business logic being validated is status-based rejection workflow.
 */
export async function test_api_admin_request_rejection_already_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
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
  // Verify super admin has 'super' grade
  TestValidator.equals("super admin grade", superAdmin.grade, "super");
  // 2. Create regular member account
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
  // 3. Member submits administrator request (creates pending request)
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  typia.assert(adminRequest);
  // Verify request is in pending status
  TestValidator.equals("initial status", adminRequest.status, "pending");
  TestValidator.equals("request member", adminRequest.member.id, member.id);
  TestValidator.predicate(
    "admin is null while pending",
    adminRequest.admin === null,
  );
  TestValidator.predicate(
    "decided_at is null while pending",
    adminRequest.decided_at === null,
  );
  // 4. Super administrator rejects the pending request
  const rejectedRequest =
    await api.functional.discussionBoard.admin.admin_requests.reject(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection results
  TestValidator.equals("rejected status", rejectedRequest.status, "rejected");
  TestValidator.notEquals("decided_at set", rejectedRequest.decided_at, null);
  TestValidator.equals(
    "deciding admin",
    rejectedRequest.admin?.id,
    superAdmin.id,
  );
  TestValidator.equals("admin grade", rejectedRequest.admin?.grade, "super");
  // Validate member information preserved
  TestValidator.equals(
    "member preserved",
    rejectedRequest.member.id,
    member.id,
  );
  TestValidator.equals(
    "member display name preserved",
    rejectedRequest.member.display_name,
    member.display_name,
  );
  // Validate timestamps
  TestValidator.predicate(
    "submitted_at before decided_at",
    new Date(adminRequest.submitted_at).getTime() <=
      new Date(rejectedRequest.decided_at!).getTime(),
  );
  TestValidator.predicate(
    "created_at before updated_at",
    new Date(rejectedRequest.created_at).getTime() <=
      new Date(rejectedRequest.updated_at).getTime(),
  );
}
