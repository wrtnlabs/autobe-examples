import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test moderator login attempt with unverified email.
 * 1. Register moderator with unverified email
 * 2. Attempt login before email verification
 * 3. Verify 401 Unauthorized is returned
 * 4. Confirm no authentication tokens are issued
 */
export async function test_api_moderator_login_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register moderator with unverified email
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    display_name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    bio: RandomGenerator.paragraph({ sentences: 2 }) ?? null,
    avatar_url: RandomGenerator.pick([
      "https://example.com/avatar1.png",
      "https://example.com/avatar2.png",
      null,
    ]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditLikeModerator.IJoin;
  const registered = await api.functional.redditLike.auth.moderator.join(
    moderatorConnection,
    {
      body: moderatorData,
    },
  );
  typia.assert(registered);
  // 2. Attempt login with unverified email (before email verification)
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("login rejected for unverified email", async () => {
    await api.functional.redditLike.auth.moderator.login(loginConnection, {
      body: {
        email: typia.assert<string>(registered.email),
        password: moderatorData.password,
      } satisfies IRedditLikeModerator.ILogin,
    });
  });
  // 3. Verify no JWT tokens were issued
  TestValidator.predicate("no token issued", () => {
    return (
      loginConnection.headers === undefined ||
      !loginConnection.headers.Authorization
    );
  });
}