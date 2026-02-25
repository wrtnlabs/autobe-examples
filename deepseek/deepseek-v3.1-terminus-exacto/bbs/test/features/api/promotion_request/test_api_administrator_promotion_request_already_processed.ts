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

export async function test_api_administrator_promotion_request_already_processed(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create regular user connection
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_login(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(user);
  // Create promotion request as user
  const promotionRequest =
    await api.functional.discussionBoard.user.promotion_requests.create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Verify initial state
  TestValidator.equals(
    "initial status is pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "initial approved_at is null",
    promotionRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "initial rejected_at is null",
    promotionRequest.rejected_at,
    null,
  );
  // Approve the promotion request initially
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          approved: true,
          reviewer_notes: "Initial approval for testing",
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // Validate the request was properly approved
  TestValidator.equals(
    "status transitioned to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at is set",
    approvedRequest.approved_at !== null,
  );
  TestValidator.equals(
    "rejected_at remains null",
    approvedRequest.rejected_at,
    null,
  );
  TestValidator.predicate(
    "reviewer notes are set",
    approvedRequest.reviewer_notes !== null,
  );
  // Validate that administrator assignment was created upon approval
  TestValidator.predicate(
    "administrator assignment created",
    approvedRequest.administrator !== null,
  );
}
