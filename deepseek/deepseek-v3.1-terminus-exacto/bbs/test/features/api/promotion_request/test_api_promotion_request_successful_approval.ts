import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function test_api_promotion_request_successful_approval(
  connection: api.IConnection,
): Promise<void> {
  // Create a regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Login the user after joining to get proper authentication
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoginAuth = await authorize_user_login(userLoginConnection, {
    body: {
      email: userAuth.email,
      password: "password123",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userLoginAuth);
  // Create a valid pending promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userLoginConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
            tags.MinLength<50> &
            tags.MaxLength<500>,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "admin123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminAuth);
  // Approve the promotion request
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes:
            "This user meets all requirements for administrator role.",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Validate approval workflow results
  TestValidator.equals(
    "promotion request status should be approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.notEquals(
    "approved_at timestamp should be set",
    approvedRequest.approved_at,
    null,
  );
  TestValidator.notEquals(
    "reviewer should be populated",
    approvedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "reviewer notes should match input",
    approvedRequest.reviewer_notes,
    "This user meets all requirements for administrator role.",
  );
  TestValidator.predicate(
    "rejected_at should remain null",
    approvedRequest.rejected_at === null,
  );
  TestValidator.notEquals(
    "administrator record should be created",
    approvedRequest.administrator,
    null,
  );
}
