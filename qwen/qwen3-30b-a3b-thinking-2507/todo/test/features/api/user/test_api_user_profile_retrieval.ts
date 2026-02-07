import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoProfile";
import type { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<ITodoUser.IJoin>(),
  });
  // 2. Retrieve the profile
  const profile: ITodoProfile =
    await api.functional.todo.user.profile.at(userConnection);
  typia.assert(profile);
  // 3. Validate response
  TestValidator.predicate(
    "display_name length should be between 1-20 characters",
    profile.display_name.length >= 1 && profile.display_name.length <= 20,
  );
  TestValidator.predicate(
    "display_name should contain only alphanumeric characters",
    /^[a-zA-Z0-9]+$/.test(profile.display_name),
  );
  TestValidator.equals(
    "deleted_at should be null for active profile",
    profile.deleted_at,
    null,
  );
}
