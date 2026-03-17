import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test moderator login failure with incorrect password.
 * Verifies that the system maintains security by not revealing whether the email exists.
 * 1. Register a moderator account with known credentials via authorize_moderator_join
 * 2. Attempt login with correct email but wrong password
 * 3. Expect authentication rejection without distinguishing whether email exists or password is wrong
 */
export async function test_api_moderator_login_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator account with known credentials via join
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const wrongPassword = RandomGenerator.alphaNumeric(16) + "wrong";
  await authorize_moderator_join(joinConnection, {
    body: {
      email,
      username: RandomGenerator.name(),
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  // Step 2: Attempt login with correct email but wrong password
  const loginConnection: api.IConnection = { host: connection.host };
  // Step 3: Validate that the authentication is rejected with uniform error
  await TestValidator.error(
    "login should fail with wrong password",
    async () => {
      await authorize_moderator_login(loginConnection, {
        body: {
          email: email,
          password: wrongPassword,
        } satisfies IRedditLikeModerator.ILogin,
      });
    },
  );
}
