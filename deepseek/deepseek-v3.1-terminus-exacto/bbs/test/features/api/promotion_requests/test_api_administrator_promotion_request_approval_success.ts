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

export async function test_api_administrator_promotion_request_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userAuth);
  // 2. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 3. Regular user creates promotion request
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "initial status should be pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "approved_at should be null initially",
    promotionRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "reviewer_notes should be null initially",
    promotionRequest.reviewer_notes,
    null,
  );
  // 4. Super administrator approves the request
  const reviewerNotes = RandomGenerator.paragraph({ sentences: 2 });
  const updatedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          approved: true,
          reviewer_notes: reviewerNotes,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(updatedRequest);
  // 5. Validate approval changes
  TestValidator.equals(
    "status should be approved",
    updatedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "approved_at should be set",
    updatedRequest.approved_at !== null,
  );
  TestValidator.predicate(
    "rejected_at should remain null",
    updatedRequest.rejected_at === null,
  );
  TestValidator.equals(
    "reviewer_notes should be saved",
    updatedRequest.reviewer_notes,
    reviewerNotes,
  );
  // 6. Validate relationships
  TestValidator.equals(
    "user should match original request",
    updatedRequest.user.id,
    promotionRequest.user.id,
  );
  TestValidator.predicate(
    "reviewer should be set",
    updatedRequest.reviewer !== null && updatedRequest.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer should be super admin",
    updatedRequest.reviewer!.id,
    superAdminAuth.id,
  );
  // 7. Validate administrator assignment creation
  TestValidator.predicate(
    "administrator should be created",
    updatedRequest.administrator !== null &&
      updatedRequest.administrator !== undefined,
  );
  TestValidator.equals(
    "administrator id should match reviewer",
    updatedRequest.administrator!.id,
    superAdminAuth.id,
  );
}
