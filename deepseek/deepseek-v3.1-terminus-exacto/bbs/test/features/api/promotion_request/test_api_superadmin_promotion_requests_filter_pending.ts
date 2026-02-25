import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
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

export async function test_api_superadmin_promotion_requests_filter_pending(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account and authenticate
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
      ip: "192.168.1.1" as string & tags.Format<"ipv4">,
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create multiple users to submit promotion requests
  const users = ArrayUtil.repeat(3, (index) => {
    const userConnection: api.IConnection = { host: connection.host };
    return userConnection;
  });
  const userCredentials = ArrayUtil.repeat(
    3,
    (index) =>
      ({
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      }) satisfies IDiscussionBoardUser.IJoin,
  );
  const promotionRequests: IDiscussionBoardAdministratorPromotionApproval[] =
    [];
  // Create users and submit promotion requests with different statuses
  for (let i = 0; i < users.length; i++) {
    const userConnection = users[i];
    const credentials = userCredentials[i];
    // Create user account
    await authorize_user_join(userConnection, {
      body: credentials,
    });
    // Submit promotion request
    const promotionRequest =
      await generate_random_discussion_board_user_promotion_requests_create(
        userConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 10,
              wordMax: 15,
            }),
          } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
        },
      );
    promotionRequests.push(promotionRequest);
  }
  // Test filtering for pending requests
  const pendingResponse =
    await api.functional.discussionBoard.superAdmin.promotion_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending" as const,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(pendingResponse);
  // Validate that only pending requests are returned
  TestValidator.equals(
    "all returned requests should be pending",
    pendingResponse.data.every((req) => req.status === "pending"),
    true,
  );
  // Validate request details
  for (const request of pendingResponse.data) {
    TestValidator.predicate(
      "request should have valid reason",
      request.reason.length >= 50 && request.reason.length <= 500,
    );
    TestValidator.predicate(
      "request should have user information",
      request.user.id !== undefined &&
        request.user.display_name !== undefined &&
        request.user.created_at !== undefined,
    );
    TestValidator.predicate(
      "pending requests should not have approval/rejection timestamps",
      request.approved_at === null && request.rejected_at === null,
    );
  }
}
