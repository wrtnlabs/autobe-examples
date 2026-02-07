import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_profile_field_completeness(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user with specific profile data
  const userConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(joinResponse);
  // Retrieve the user profile
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate business logic relationships
  TestValidator.equals(
    "email matches registration email",
    profile.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "display_name matches registration",
    profile.display_name,
    joinResponse.display_name,
  );
  TestValidator.predicate(
    "updated_at is same or after created_at",
    new Date(profile.updated_at) >= new Date(profile.created_at),
  );
}
