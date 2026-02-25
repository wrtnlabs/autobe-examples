import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
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
import { generate_random_discussion_board_registered_user_email_verifications_create_email_verification } from "../../../generate/generate_random_discussion_board_registered_user_email_verifications_create_email_verification";
import { prepare_random_discussion_board_registered_user_email_verification } from "../../../prepare/prepare_random_discussion_board_registered_user_email_verification";

export async function test_api_email_verification_token_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_registered_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(userAuth);
  // Use the authorized user connection for subsequent calls
  userConnection.headers = { Authorization: userAuth.token.access };
  // 2. Prepare email verification token create body
  const tokenString = RandomGenerator.alphaNumeric(64);
  const expirationDate = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour in future
  const createBody: IDiscussionBoardRegisteredUserEmailVerification.ICreate = {
    registeredUserId: userAuth.id,
    token: tokenString,
    expiredAt: expirationDate,
  };
  // 3. Create email verification token
  const emailVerification =
    await generate_random_discussion_board_registered_user_email_verifications_create_email_verification(
      userConnection,
      { body: createBody },
    );
  typia.assert(emailVerification);
  // 4. Validate response properties
  TestValidator.equals(
    "registeredUserId matches",
    emailVerification.registered_user_id,
    userAuth.id,
  );
  TestValidator.equals("token matches", emailVerification.token, tokenString);
  TestValidator.equals(
    "expiredAt matches",
    emailVerification.expired_at,
    expirationDate,
  );
  // 5. Confirm audit timestamps
  TestValidator.predicate(
    "createdAt present",
    typeof emailVerification.created_at === "string" &&
      emailVerification.created_at.length > 0,
  );
  TestValidator.predicate(
    "updatedAt present",
    typeof emailVerification.updated_at === "string" &&
      emailVerification.updated_at.length > 0,
  );
}
