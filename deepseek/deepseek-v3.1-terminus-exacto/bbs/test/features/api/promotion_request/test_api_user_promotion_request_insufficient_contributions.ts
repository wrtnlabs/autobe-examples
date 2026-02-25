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
 * Test validates administrator promotion request rejection for users with insufficient contributions.
 * 1) Create a new user account via user join (account will be very new, meeting 'age < 30 days')
 * 2) Without creating any articles or comments (meeting 'articles < 10, comments < 50')
 * 3) Attempt to submit administrator promotion request with valid justification
 * 4) System should reject due to insufficient contributions (business logic error)
 */
export async function test_api_user_promotion_request_insufficient_contributions(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user connection with proper isolation
  const userConnection: api.IConnection = { host: connection.host };
  // Step 1: Create new user account (fresh account with no contributions)
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(user);
  // Step 2: Attempt to create promotion request (should fail with business logic error)
  // The utility function will generate a valid justification text meeting requirements
  await TestValidator.error(
    "promotion request should be rejected for insufficient contributions",
    async () => {
      await generate_random_discussion_board_user_promotion_requests_create(
        userConnection,
        {}, // Empty props - utility function generates random valid data
      );
    },
  );
}
