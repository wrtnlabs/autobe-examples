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

export async function test_api_admin_request_view_approved_with_decision(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member setup - register and submit admin request
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
  // 2. Submit admin request as member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  TestValidator.equals(
    "request status is pending",
    adminRequest.status,
    "pending",
  );
  TestValidator.predicate(
    "decided_at is null for pending",
    adminRequest.decided_at === null,
  );
  // 3. Admin setup - register as super administrator
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
  // 4. Approve the admin request
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "decided_at is populated",
    approvedRequest.decided_at !== null,
  );
  TestValidator.predicate(
    "admin info is present",
    approvedRequest.admin !== null,
  );
  // 5. Retrieve the approved request
  const retrievedRequest =
    await api.functional.discussionBoard.admin.admin_requests.at(
      adminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 6. Validate response structure
  TestValidator.equals(
    "status is approved",
    retrievedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "decided_at is not null",
    retrievedRequest.decided_at !== null,
  );
  TestValidator.predicate("admin info exists", retrievedRequest.admin !== null);
  TestValidator.predicate(
    "admin has id",
    retrievedRequest.admin!.id !== undefined,
  );
  TestValidator.predicate(
    "admin has grade",
    retrievedRequest.admin!.grade !== undefined,
  );
  TestValidator.predicate(
    "admin has created_at",
    retrievedRequest.admin!.created_at !== undefined,
  );
  TestValidator.predicate(
    "admin member info exists",
    retrievedRequest.admin!.member !== undefined,
  );
  TestValidator.predicate(
    "member is_admin is true",
    retrievedRequest.member.is_admin === true,
  );
  TestValidator.equals(
    "request id matches",
    retrievedRequest.id,
    adminRequest.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRequest.reason,
    adminRequest.reason,
  );
  TestValidator.predicate(
    "submitted_at is valid",
    retrievedRequest.submitted_at !== undefined,
  );
  TestValidator.predicate(
    "created_at is valid",
    retrievedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedRequest.updated_at !== undefined,
  );
}
