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

/**
 * Test that validates users cannot submit multiple pending promotion requests.
 * This test ensures the business rule preventing duplicate pending requests is enforced.
 */
export async function test_api_user_promotion_request_duplicate_pending(
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
  // Update connection headers with authorization token
  userConnection.headers = { Authorization: user.token.access };
  // Submit first promotion request with sufficient length reason
  const firstRequest =
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 5,
            sentenceMax: 8,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  typia.assert(firstRequest);
  // Verify the first request has pending status
  TestValidator.equals("first request status", firstRequest.status, "pending");
  // Attempt to submit second promotion request with different reason - should fail
  await TestValidator.error("duplicate pending request", async () => {
    await generate_random_discussion_board_user_promotion_requests_create(
      userConnection,
      {
        body: {
          reason: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 4,
            sentenceMax: 6,
          }),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.ICreate,
      },
    );
  });
}
