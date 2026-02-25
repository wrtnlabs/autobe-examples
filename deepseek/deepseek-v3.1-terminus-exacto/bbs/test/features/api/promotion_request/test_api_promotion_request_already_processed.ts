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
 * Test handling of promotion requests that are already processed.
 * 1. Create super admin account and authenticate
 * 2. Create first user and promotion request
 * 3. Approve the first request successfully
 * 4. Attempt to approve the same request again (should fail)
 * 5. Create second user and promotion request
 * 6. Test approval on fresh pending request (should succeed)
 */
export async function test_api_promotion_request_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first user and promotion request
  const firstUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const firstPromotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      firstUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(firstPromotionRequest);
  // Approve first request successfully
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: firstPromotionRequest.id,
        body: {
          reviewer_notes: "Approved for testing",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(approvedRequest);
  // Attempt to approve same request again (should fail)
  await TestValidator.error("duplicate approval should fail", async () => {
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: firstPromotionRequest.id,
        body: {
          reviewer_notes: "Second approval attempt",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  });
  // Create second user and promotion request
  const secondUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user456",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const secondPromotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      secondUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(secondPromotionRequest);
  // Test approval on fresh pending request (should succeed)
  const secondApprovedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.approve(
      superAdminConnection,
      {
        requestId: secondPromotionRequest.id,
        body: {
          reviewer_notes: "Approved second request",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IApprove,
      },
    );
  typia.assert(secondApprovedRequest);
}
