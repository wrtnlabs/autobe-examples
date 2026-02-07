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

export async function test_api_promotion_request_approval_with_reviewer_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular user who will submit the promotion request
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Update user connection with authentication token
  userConnection.headers ??= {};
  userConnection.headers.Authorization = userAuth.token.access;
  // 2. Create a promotion request from the authenticated user
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 15,
            wordMax: 20,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionRequest.ICreate,
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "initial status should be pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "request should belong to user",
    promotionRequest.user.id,
    userAuth.id,
  );
  TestValidator.predicate(
    "administrator should be null before approval",
    promotionRequest.administrator === null,
  );
  TestValidator.predicate(
    "reviewer should be null before approval",
    promotionRequest.reviewer === null,
  );
  // 3. Create and authenticate a super administrator who will review the request
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Update super admin connection with authentication token
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdminAuth.token.access;
  // 4. Approve the promotion request with generated reviewer notes
  const reviewerNotes = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 5,
    wordMax: 10,
  });
  const approvedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
          reviewer_notes: reviewerNotes,
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  // 5. Validate the approval results comprehensively
  TestValidator.equals(
    "status should be approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.equals(
    "reviewer notes should match",
    approvedRequest.reviewer_notes,
    reviewerNotes,
  );
  TestValidator.predicate(
    "approved_at should be set",
    approvedRequest.approved_at !== null,
  );
  TestValidator.predicate(
    "rejected_at should be null",
    approvedRequest.rejected_at === null,
  );
  TestValidator.predicate(
    "reviewer should be set",
    approvedRequest.reviewer !== null,
  );
  TestValidator.equals(
    "reviewer id should match super admin",
    approvedRequest.reviewer?.id,
    superAdminAuth.id,
  );
  TestValidator.predicate(
    "administrator should be created",
    approvedRequest.administrator !== null,
  );
  TestValidator.equals(
    "user should match original requestor",
    approvedRequest.user.id,
    userAuth.id,
  );
  // Validate administrator record properties
  if (approvedRequest.administrator) {
    TestValidator.equals(
      "administrator grade should be regular",
      approvedRequest.administrator.grade,
      "regular",
    );
    TestValidator.predicate(
      "administrator should be active",
      approvedRequest.administrator.is_active,
    );
    TestValidator.predicate(
      "promoted_at should be set",
      approvedRequest.administrator.promoted_at !== undefined,
    );
  }
  // 6. Test that the promotion request cannot be approved again (duplicate approval prevention)
  await TestValidator.error("should not allow duplicate approval", async () => {
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
          reviewer_notes: "Attempting duplicate approval",
        } satisfies IDiscussionBoardAdministratorPromotionRequest.IUpdate,
      },
    );
  });
}
