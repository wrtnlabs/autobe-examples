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
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create member account who will request admin privileges
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Member submits administrator privilege request
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
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
    "reviewed_at is null initially",
    adminRequest.reviewed_at,
    null,
  );
  TestValidator.equals(
    "reviewer is null initially",
    adminRequest.reviewer,
    null,
  );
  // 4. Super administrator reviews and approves the request
  const reviewedRequest =
    await api.functional.discussionBoard.admin.admin_requests.review(
      superAdminConnection,
      {
        adminRequestId: adminRequest.id,
        body: {
          status: "approved",
        } satisfies IDiscussionBoardAdminRequest.IReview,
      },
    );
  typia.assert(reviewedRequest);
  // 5. Validate approval results
  TestValidator.equals(
    "status changed to approved",
    reviewedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "reviewed_at is recorded",
    reviewedRequest.reviewed_at !== null,
  );
  TestValidator.equals(
    "reviewer is recorded",
    reviewedRequest.reviewer?.id,
    superAdmin.id,
  );
  TestValidator.equals("member matches", reviewedRequest.member.id, member.id);
  // 6. Verify member was promoted to administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const memberAsAdmin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: member.email,
      password: memberPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(memberAsAdmin);
  TestValidator.equals("member is now an admin", memberAsAdmin.id, member.id);
  TestValidator.predicate(
    "admin grade is regular",
    memberAsAdmin.grade === "regular",
  );
}
