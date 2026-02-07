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

export async function test_api_promotion_request_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "super_admin_password",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create and authenticate regular user account
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user_password",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // User submits promotion request
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
  // Super admin rejects the promotion request with reason
  const rejectionReason =
    "User does not meet the required criteria for administrator role at this time.";
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "rejected",
          reviewer_notes: rejectionReason,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Validate rejection details
  TestValidator.equals(
    "request status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejected_at timestamp should be set",
    rejectedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer notes should match",
    rejectedRequest.reviewer_notes,
    rejectionReason,
  );
  TestValidator.notEquals(
    "reviewer should be set",
    rejectedRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "approved_at should remain null",
    rejectedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "administrator should remain null",
    rejectedRequest.administrator,
    null,
  );
  // Test that request cannot be rejected again
  await TestValidator.error(
    "should not allow duplicate rejection",
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.update(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            status: "rejected",
            reviewer_notes: "Another rejection attempt",
          } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
        },
      );
    },
  );
}
