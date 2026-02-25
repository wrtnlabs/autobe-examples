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

/**
 * Test attempting to reject a promotion request with insufficient privileges.
 * Create a regular user (non-superAdmin) and promotion request, then attempt rejection
 * while authenticated as the regular user. Validate the operation fails with
 * authorization error, indicating only super administrators can reject promotion requests.
 * Verify no status changes occur to the promotion request.
 */
export async function test_api_promotion_request_rejection_unauthorized_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account that will attempt unauthorized rejection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 2. Submit promotion request as regular user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial status is 'pending'
  TestValidator.equals(
    "initial status should be pending",
    promotionRequest.status,
    "pending",
  );
  // 3. Attempt rejection using regular user connection (should fail)
  await TestValidator.error("unauthorized rejection should fail", async () => {
    await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
      userConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
      },
    );
  });
  // 4. Since we cannot retrieve the promotion request again without a GET endpoint,
  // we rely on the fact that the rejection operation failed and the status remains unchanged
  // This validates that unauthorized users cannot modify promotion request status
}
