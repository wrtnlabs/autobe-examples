import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import type { IMultiUserTodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_multi_user_todo_user_email_verifications_create_email_verification } from "../../../generate/generate_random_multi_user_todo_user_email_verifications_create_email_verification";
import { prepare_random_multi_user_todo_user_email_verification } from "../../../prepare/prepare_random_multi_user_todo_user_email_verification";

export async function test_api_user_email_verification_creation_success_and_duplicate_token(
  connection: api.IConnection,
) {
  // 1. User registration to acquire authorized user context
  const userJoinConnection: api.IConnection = { host: connection.host };
  const newUserJoinBody: IMultiUserTodoUser.IJoin = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    displayName: RandomGenerator.name(),
    href: "https://example.com/join",
    referrer: "https://google.com",
  };
  const authorizedUser = await authorize_user_join(userJoinConnection, {
    body: newUserJoinBody,
  });
  typia.assert(authorizedUser);
  // Create an actor-specific connection with proper authorization
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = userJoinConnection.headers ?? {};
  // 2. Create a new email verification record with unique token
  const createEmailVerificationBody1: IMultiUserTodoUserEmailVerification.ICreate =
    {
      multiUserTodoUserId: authorizedUser.id,
      token: RandomGenerator.alphaNumeric(64),
    };
  const evRecord1 =
    await generate_random_multi_user_todo_user_email_verifications_create_email_verification(
      userConnection,
      { body: createEmailVerificationBody1 },
    );
  typia.assert(evRecord1);
  // Validate the email verification record fields
  TestValidator.equals(
    "email verification user id",
    evRecord1.multiUserTodoUserId,
    authorizedUser.id,
  );
  TestValidator.equals(
    "email verification token",
    evRecord1.token,
    createEmailVerificationBody1.token,
  );
  TestValidator.predicate(
    "email verification createdAt present",
    evRecord1.createdAt.length > 0,
  );
  TestValidator.predicate(
    "email verification updatedAt present",
    evRecord1.updatedAt.length > 0,
  );
  // 3. Attempt to create duplicate email verification with the same token
  const createEmailVerificationBody2: IMultiUserTodoUserEmailVerification.ICreate =
    {
      multiUserTodoUserId: authorizedUser.id,
      token: createEmailVerificationBody1.token, // duplicate token
    };
  await TestValidator.error(
    "create duplicate email verification token should fail",
    async () => {
      await generate_random_multi_user_todo_user_email_verifications_create_email_verification(
        userConnection,
        { body: createEmailVerificationBody2 },
      );
    },
  );
}
