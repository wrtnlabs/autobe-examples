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

export async function test_api_user_registration_with_verification(
  connection: api.IConnection,
) {
  // 1. Register the user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, { body: {} });
  // 2. Create email verification token using the user's connection
  const verificationToken =
    await generate_random_todo_user_email_verifications_create(userConnection, {
      body: {},
    });
  typia.assert(verificationToken);
  // 3. Validate expiration - should be 15 minutes from now
  const expiresAt = new Date(verificationToken.expires_at);
  const now = new Date();
  const minutesDifference = (expiresAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "should expire within 15 minutes",
    minutesDifference <= 15 && minutesDifference >= 0,
  );
}
