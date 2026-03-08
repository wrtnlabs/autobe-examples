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

export async function test_api_admin_request_approval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member submits administrator privilege request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // Member submits admin request
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // Validate initial state
  TestValidator.equals(
    "initial status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "reviewer is null initially",
    adminRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewed_at is null initially",
    adminRequest.reviewed_at,
    null,
  );
  // 2. Super administrator joins and authenticates
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdminAuth);
  // 3. Super administrator approves the request
  const updatedRequest =
    await api.functional.discussionBoard.admin.admin_requests.updateStatus(
      superAdminConnection,
      {
        requestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 4. Validate approval response
  TestValidator.equals(
    "status changed to approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.notEquals("reviewer is now set", updatedRequest.reviewer, null);
  TestValidator.notEquals(
    "reviewed_at is now set",
    updatedRequest.reviewed_at,
    null,
  );
  // Validate reviewer is the super admin
  TestValidator.equals(
    "reviewer email matches super admin",
    updatedRequest.reviewer!.email,
    superAdminAuth.email,
  );
  TestValidator.equals(
    "reviewer display_name matches super admin",
    updatedRequest.reviewer!.display_name,
    superAdminAuth.display_name,
  );
  // Validate author is the member who submitted
  TestValidator.equals(
    "author id matches member",
    updatedRequest.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author displayName matches member",
    updatedRequest.author.displayName,
    memberAuth.displayName,
  );
  // Validate timestamps
  TestValidator.predicate(
    "submitted_at is set",
    updatedRequest.submitted_at !== null,
  );
  TestValidator.predicate(
    "reviewed_at is after submitted_at",
    new Date(updatedRequest.reviewed_at!) >=
      new Date(updatedRequest.submitted_at),
  );
  TestValidator.predicate(
    "updated_at is after reviewed_at",
    new Date(updatedRequest.updated_at) >=
      new Date(updatedRequest.reviewed_at!),
  );
}
