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

export async function test_api_administrator_promotion_request_rejection_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a regular user account
  const userJoinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userJoinResponse);
  // Step 2: Create a pending promotion request as the regular user
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
  // Step 3: Authenticate as super administrator
  const superAdminResponse = await authorize_super_admin_login(
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
  typia.assert(superAdminResponse);
  // Step 4: Reject the promotion request as super administrator
  const rejectionNotes = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          approved: false,
          reviewer_notes: rejectionNotes,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IUpdate,
      },
    );
  typia.assert(rejectedRequest);
  // Step 5: Validate rejection workflow
  TestValidator.equals(
    "status should be rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejected_at should be set",
    rejectedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "approved_at should remain null",
    rejectedRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "reviewer notes should match",
    rejectedRequest.reviewer_notes,
    rejectionNotes,
  );
  TestValidator.equals(
    "user should remain unchanged",
    rejectedRequest.user.id,
    userJoinResponse.id,
  );
  TestValidator.equals(
    "no administrator assignment should be created",
    rejectedRequest.administrator,
    null,
  );
  TestValidator.notEquals(
    "updated_at should be after created_at",
    rejectedRequest.updated_at,
    rejectedRequest.created_at,
  );
}
