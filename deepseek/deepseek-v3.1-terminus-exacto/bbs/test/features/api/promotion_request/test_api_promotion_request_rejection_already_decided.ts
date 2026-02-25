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

export async function test_api_promotion_request_rejection_already_decided(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 15,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Approve the promotion request first
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Verify the request is approved
  TestValidator.equals(
    "request status should be approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at should be set",
    approvedRequest.approved_at !== null,
  );
  // Attempt to reject the already approved request - should fail
  await TestValidator.httpError(
    "rejecting approved request should fail",
    [400, 409, 422],
    async () => {
      await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
        superAdminConnection,
        {
          requestId: promotionRequest.id,
          body: {
            reviewer_notes: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
        },
      );
    },
  );
  // Verify the request remains approved by checking the approved request data
  TestValidator.equals(
    "status should remain approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at should remain set",
    approvedRequest.approved_at !== null,
  );
  TestValidator.equals(
    "rejected_at should remain null",
    approvedRequest.rejected_at,
    null,
  );
}
