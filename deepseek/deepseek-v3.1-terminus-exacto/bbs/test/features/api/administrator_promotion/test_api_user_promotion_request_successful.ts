import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_promotion_requests_create } from "../../../generate/generate_random_discussion_board_user_promotion_requests_create";
import { prepare_random_discussion_board_administrator_promotion_approval } from "../../../prepare/prepare_random_discussion_board_administrator_promotion_approval";

export async function test_api_user_promotion_request_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Submit promotion request with valid reason
  const promotionRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(promotionRequest);
  // Validate promotion request properties
  TestValidator.equals(
    "status should be pending",
    promotionRequest.status,
    "pending",
  );
  TestValidator.notEquals("id should be generated", promotionRequest.id, "");
  TestValidator.predicate(
    "reason should be valid length",
    promotionRequest.reason.length >= 50 &&
      promotionRequest.reason.length <= 500,
  );
  TestValidator.equals(
    "user association should match",
    promotionRequest.user.id,
    user.id,
  );
  TestValidator.predicate(
    "created_at should be set",
    promotionRequest.created_at !== "",
  );
  TestValidator.equals(
    "approved_at should be null",
    promotionRequest.approved_at,
    null,
  );
  TestValidator.equals(
    "rejected_at should be null",
    promotionRequest.rejected_at,
    null,
  );
  TestValidator.equals(
    "reviewer_notes should be null",
    promotionRequest.reviewer_notes,
    null,
  );
  TestValidator.equals(
    "reviewer should be null",
    promotionRequest.reviewer,
    null,
  );
  TestValidator.equals(
    "administrator should be null",
    promotionRequest.administrator,
    null,
  );
}
