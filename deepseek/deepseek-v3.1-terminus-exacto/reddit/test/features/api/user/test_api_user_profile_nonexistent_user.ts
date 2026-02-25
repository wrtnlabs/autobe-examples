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

export async function test_api_user_profile_nonexistent_user(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random username that doesn't exist
  const nonexistentUsername = typia.random<string>();
  // Attempt to retrieve profile for non-existent user and validate 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent user",
    404,
    async () => {
      await api.functional.communityPlatform.user.at(connection, {
        username: nonexistentUsername,
      });
    },
  );
}
