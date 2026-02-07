import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_request } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_request";

export async function test_api_superadmin_promotion_request_approval_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Step 2: Submit promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request status",
    promotionRequest.status,
    "pending",
  );
  // Step 3: Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminPassword = typia.random<string & tags.Format<"password">>();
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: superAdminPassword,
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 4: Authenticate as super administrator
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdmin.email,
      password: superAdminPassword,
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Step 5: Review and approve promotion request with notes
  const reviewNotes =
    "This user has demonstrated excellent community engagement and technical expertise. Their request is approved with full administrative privileges.";
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.review(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          approved: true,
          notes: reviewNotes,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IReview,
      },
    );
  typia.assert(approvedRequest);
  // Step 6: Validate the updated promotion request
  TestValidator.equals(
    "promotion request status",
    approvedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "approved_at timestamp",
    approvedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "reviewer notes",
    approvedRequest.reviewer_notes,
    reviewNotes,
  );
  TestValidator.notEquals(
    "reviewer information",
    approvedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer id",
    approvedRequest.reviewer?.id,
    superAdmin.id,
  );
  TestValidator.notEquals(
    "administrator assignment",
    approvedRequest.administrator,
    null,
  );
  TestValidator.equals(
    "user id matches",
    approvedRequest.administrator?.user.id,
    user.id,
  );
}
