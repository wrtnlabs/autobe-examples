import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_profile_update_valid_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const registerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(registerConnection, {
    body: {
      email: typia.assert<string & tags.Format<"email"> & tags.MaxLength<255> & tags.MinLength<1>>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri"> & tags.MaxLength<2048> & tags.MinLength<1>>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri"> & tags.MaxLength<2048> & tags.MinLength<1>>(typia.random<string & tags.Format<"uri">>()),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(joined);
  // 2. Create profile update connection with auth token
  const updateConnection: api.IConnection = { host: connection.host };
  updateConnection.headers = {
    Authorization: joined.token.access,
  };
  // 3. Update profile display name
  const newName = RandomGenerator.name();
  const updatedProfile = await api.functional.todoApp.member.profile.put(
    updateConnection,
    {
      body: {
        display_name: newName,
      } satisfies ITodoAppProfile.IUpdate,
    },
  );
  typia.assert(updatedProfile);
  // 4. Validate the update
  TestValidator.equals(
    "display name updated",
    updatedProfile.display_name,
    newName,
  );
  TestValidator.predicate("updated_at is newer", () => {
    return (
      new Date(updatedProfile.updated_at).getTime() >
      new Date(updatedProfile.created_at).getTime()
    );
  });
}