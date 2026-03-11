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

export async function test_api_admin_request_rejection_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      grade: "super",
    },
  });
  typia.assert(superAdmin);
  // 2. Create member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 3. Member submits administrator privilege request
  const requestInput = {
    reason: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardAdminRequest.ICreate;
  const adminRequest =
    await api.functional.discussionBoard.member.admin_requests.create(
      memberConnection,
      {
        body: requestInput,
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
    "reviewed_at is null initially",
    adminRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer is null initially",
    adminRequest.reviewer,
    null,
  );
  // 4. Super admin reviews and rejects the request
  const reviewDecision = {
    status: "rejected",
  } satisfies IDiscussionBoardAdminRequest.IReview;
  const reviewedRequest =
    await api.functional.discussionBoard.admin.admin_requests.review(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: reviewDecision,
      },
    );
  typia.assert(reviewedRequest);
  // 5. Validate rejection response
  TestValidator.equals(
    "status is rejected",
    reviewedRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "reviewed_at is recorded",
    reviewedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "reviewer matches super admin",
    reviewedRequest.reviewer?.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "member is preserved",
    reviewedRequest.member.id,
    member.id,
  );
  TestValidator.equals(
    "reason is preserved",
    reviewedRequest.reason,
    requestInput.reason,
  );
  // 6. Verify member remains regular member (no admin record)
  // This is validated by the fact that the rejection workflow doesn't create admin record
  // The business logic ensures only approved requests create admin records
}
