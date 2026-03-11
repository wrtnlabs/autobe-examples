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

export async function test_api_admin_request_retrieve_with_reviewer_info(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and submit admin request
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberAuth);
  // Submit admin request as member
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
  // 2. Create super admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        grade: "super",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 3. Approve the request as super admin
  const updatedRequest =
    await api.functional.discussionBoard.admin.admin_requests.update(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 4. Retrieve the request details
  const retrievedRequest =
    await api.functional.discussionBoard.admin.admin_requests.at(
      adminConnection,
      {
        adminRequestId: adminRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 5. Validate reviewer information is present
  TestValidator.predicate(
    "reviewer exists",
    retrievedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer ID matches",
    retrievedRequest.reviewer!.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "reviewer display name matches",
    retrievedRequest.reviewer!.display_name,
    adminAuth.display_name,
  );
  TestValidator.predicate(
    "reviewer grade is super",
    retrievedRequest.reviewer!.grade === "super",
  );
  TestValidator.predicate(
    "reviewed_at is set",
    retrievedRequest.reviewed_at !== null,
  );
  TestValidator.predicate(
    "request status is approved",
    retrievedRequest.status === "approved",
  );
}
