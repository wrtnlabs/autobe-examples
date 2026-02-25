import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_join_duplicate_username_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Register first user to create existing username
  const userConnection1: api.IConnection = { host: connection.host };
  const existingUser = await authorize_user_join(userConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(existingUser);
  // Phase 2: Attempt to register second user with same username, different email
  const userConnection2: api.IConnection = { host: connection.host };
  const conflictingJoinInput = {
    email: typia.random<string & tags.Format<"email">>(), // Different email
    password: RandomGenerator.alphaNumeric(16),
    username: existingUser.username, // Same username
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatar_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  // Use SDK directly for second call to catch the expected error
  await TestValidator.error(
    "should reject duplicate username registration",
    async () => {
      await api.functional.communityPlatform.auth.user.join(userConnection2, {
        body: conflictingJoinInput,
      });
    },
  );
}
