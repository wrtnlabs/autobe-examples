import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_moderator_join_username_already_exists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the first moderator with a random username
  const moderatorConnection1: api.IConnection = { host: connection.host };
  // Generate a reproducible unique username
  const username = `${RandomGenerator.alphabets(8)}`;
  const body1: ICommunityPlatformModerator.IJoin = {
    username,
  } satisfies ICommunityPlatformModerator.IJoin;
  const authorized1 = await authorize_moderator_join(moderatorConnection1, {
    body: body1,
  });
  typia.assert(authorized1);
  // Update headers with token
  moderatorConnection1.headers ??= {};
  moderatorConnection1.headers.Authorization = authorized1.token.access;
  // 2. Attempt to create another moderator with the same username
  const moderatorConnection2: api.IConnection = { host: connection.host };
  const body2: ICommunityPlatformModerator.IJoin = {
    username,
  } satisfies ICommunityPlatformModerator.IJoin;
  await TestValidator.httpError(
    "attempt join with duplicate username",
    409,
    async () => {
      await authorize_moderator_join(moderatorConnection2, { body: body2 });
    },
  );
}
