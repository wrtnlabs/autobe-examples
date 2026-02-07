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

export async function test_api_user_profile_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {} satisfies ITodoUser.IJoin,
  });
  const profile = await api.functional.todo.user.profile.at(userConnection);
  typia.assert(profile);
  TestValidator.equals(
    "deleted_at should be null for active profiles",
    profile.deleted_at,
    null,
  );
  TestValidator.predicate(
    "display_name length 1-20 characters",
    profile.display_name.length >= 1 && profile.display_name.length <= 20,
  );
  TestValidator.predicate(
    "created_at valid ISO format",
    profile.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated_at valid ISO format",
    profile.updated_at.includes("T"),
  );
}
