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
 * Test admin grade demotion from super to regular.
 *
 * This test validates the workflow where a super administrator demotes another
 * super administrator to regular administrator grade. The test creates two admin
 * actors: the first super admin who performs the demotion, and the second admin
 * who gets promoted to super then demoted back to regular.
 *
 * Test flow:
 * 1. Create and authenticate as first super administrator
 * 2. Create a member account that will become the second administrator
 * 3. Submit admin request from the member
 * 4. First super admin approves the request (creates regular admin)
 * 5. First super admin promotes second admin to super grade
 * 6. First super admin demotes second admin back to regular grade
 * 7. Validate the demotion response and grade change
 */
export async function test_api_admin_grade_demotion_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as first super administrator
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
  // 2. Create a member account that will become the second administrator
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Submit admin request from the member
  const adminRequest =
    await generate_random_discussion_board_member_admin_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
          }),
        } satisfies IDiscussionBoardAdminRequest.ICreate,
      },
    );
  typia.assert(adminRequest);
  // 4. First super admin approves the request (creates regular admin)
  const approvedRequest =
    await api.functional.discussionBoard.admin.admin_requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Login as the second admin to get admin details
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdminAuth = await authorize_admin_login(secondAdminConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(secondAdminAuth);
  // Store the initial updated_at before promotion
  const initialUpdatedAt = secondAdminAuth.updated_at;
  // 6. First super admin promotes second admin to super grade
  const promotedAdmin =
    await api.functional.discussionBoard.admin.admins.grade.updateGrade(
      superAdminConnection,
      {
        adminId: secondAdminAuth.id,
        body: {
          grade: "super",
        } satisfies IDiscussionBoardAdmin.IUpdateGrade,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.equals("promoted to super", promotedAdmin.grade, "super");
  TestValidator.notEquals(
    "updated_at changed on promotion",
    promotedAdmin.updated_at,
    initialUpdatedAt,
  );
  // 7. First super admin demotes second admin back to regular grade
  const demotedAdmin =
    await api.functional.discussionBoard.admin.admins.grade.updateGrade(
      superAdminConnection,
      {
        adminId: secondAdminAuth.id,
        body: {
          grade: "regular",
        } satisfies IDiscussionBoardAdmin.IUpdateGrade,
      },
    );
  typia.assert(demotedAdmin);
  // Validate demotion results
  TestValidator.equals("demoted to regular", demotedAdmin.grade, "regular");
  TestValidator.notEquals(
    "updated_at changed on demotion",
    demotedAdmin.updated_at,
    promotedAdmin.updated_at,
  );
  TestValidator.equals(
    "admin id preserved",
    demotedAdmin.id,
    secondAdminAuth.id,
  );
  TestValidator.equals(
    "member display name preserved",
    demotedAdmin.member.display_name,
    member.display_name,
  );
  TestValidator.predicate(
    "demoted admin is still active",
    demotedAdmin.deleted_at === null,
  );
}
