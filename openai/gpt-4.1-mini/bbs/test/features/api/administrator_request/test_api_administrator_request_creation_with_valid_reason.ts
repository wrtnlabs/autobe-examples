import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request } from "../../../generate/generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request";
import { prepare_random_discussion_board_administrator_request } from "../../../prepare/prepare_random_discussion_board_administrator_request";

/**
 * Test submitting a new administrator request by an authenticated registered user with a valid reason text.
 * Validate that the request is recorded with status 'pending' and contains the correct reason text.
 * Confirm the returned object includes ID and status.
 * Dependencies include a registered user authentication via join operation.
 */
export async function test_api_administrator_request_creation_with_valid_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser: IDiscussionBoardRegisteredUser.IAuthorized =
    await authorize_registered_user_join(userConnection, {
      body: {
        email: RandomGenerator.alphabets(8) + "@test.com",
        password: "Pass1234",
      },
    });
  // Mutate userConnection headers with new authorization token
  userConnection.headers = {
    Authorization: authorizedUser.token.access,
  };
  // 2. Create a new administrator request with a valid reason
  const reason = RandomGenerator.paragraph({ sentences: 3 });
  const adminRequest: IDiscussionBoardAdministratorRequest =
    await generate_random_discussion_board_registered_user_administrator_requests_create_administrator_request(
      userConnection,
      { body: { reason } },
    );
  // 3. Assert returned administrator request structure
  typia.assert(adminRequest);
  // 4. Validate returned fields
  TestValidator.predicate(
    "administrator request has id",
    typeof adminRequest.id === "string" && adminRequest.id.length > 0,
  );
  TestValidator.equals(
    "administrator request status",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals(
    "administrator request reason",
    adminRequest.reason,
    reason,
  );
  TestValidator.equals(
    "administrator request registered user id",
    adminRequest.registered_user_id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "administrator request registered user email",
    adminRequest.registeredUser.email,
    authorizedUser.email,
  );
}
