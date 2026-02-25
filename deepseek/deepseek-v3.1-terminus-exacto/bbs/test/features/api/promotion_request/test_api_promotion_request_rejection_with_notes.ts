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

export async function test_api_promotion_request_rejection_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular user
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinResult = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userJoinResult);
  // 2. Submit a promotion request as the user
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
    "initial status pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.equals(
    "no rejected_at initially",
    promotionRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "no reviewer notes initially",
    promotionRequest.reviewer_notes,
    null,
  );
  // 3. Create a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResult = await authorize_super_admin_join(
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
  typia.assert(superAdminJoinResult);
  // 4. Reject the promotion request with notes
  const reviewerNotes = RandomGenerator.paragraph({ sentences: 2 });
  const rejectedRequest =
    await api.functional.discussionBoard.superAdmin.promotion_requests.reject(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          reviewer_notes: reviewerNotes,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IReject,
      },
    );
  typia.assert(rejectedRequest);
  // 5. Validate rejection details
  TestValidator.equals(
    "status changed to rejected",
    rejectedRequest.status,
    "rejected",
  );
  TestValidator.notEquals(
    "rejected_at timestamp recorded",
    rejectedRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer notes saved",
    rejectedRequest.reviewer_notes,
    reviewerNotes,
  );
  TestValidator.equals(
    "approved_at remains null",
    rejectedRequest.approved_at,
    null,
  );
  TestValidator.predicate(
    "reviewer super admin recorded",
    rejectedRequest.reviewer !== null && rejectedRequest.reviewer !== undefined,
  );
  TestValidator.equals(
    "reviewer id matches super admin",
    rejectedRequest.reviewer?.id,
    superAdminJoinResult.id,
  );
  TestValidator.equals(
    "user remains unchanged",
    rejectedRequest.user.id,
    userJoinResult.id,
  );
  TestValidator.equals(
    "administrator remains null",
    rejectedRequest.administrator,
    null,
  );
  TestValidator.equals(
    "reason unchanged",
    rejectedRequest.reason,
    promotionRequest.reason,
  );
  TestValidator.predicate(
    "rejected_at is ISO datetime",
    rejectedRequest.rejected_at !== null &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(rejectedRequest.rejected_at),
  );
}
