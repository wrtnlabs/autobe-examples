import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import type { ITodoUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_todo_user_email_verifications_create } from "../../../generate/generate_random_todo_user_email_verifications_create";
import { prepare_random_todo_user_email_verification } from "../../../prepare/prepare_random_todo_user_email_verification";

export async function test_api_user_registration_verification_expiry(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  // 2. Create email verification token
  const verification =
    await api.functional.todo.user.email_verifications.create(userConnection, {
      body: {} satisfies ITodoUserEmailVerification.ICreate,
    });
  typia.assert(verification);
  // 3. Verify token expiration
  const createdAt = new Date(verification.created_at);
  const expiresAt = new Date(verification.expires_at);
  const minutesDifference =
    (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);
  TestValidator.equals("verification token expiration", minutesDifference, 15);
}
