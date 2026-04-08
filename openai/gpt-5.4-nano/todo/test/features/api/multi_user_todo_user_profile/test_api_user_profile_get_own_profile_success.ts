import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_user_profile_get_own_profile_success(
  connection: api.IConnection,
): Promise<void> {
  // Arrange: member joins to obtain authenticated profile identifiers
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      password: typia.random<
        string & tags.MinLength<1> & tags.Format<"password">
      >(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  const profileId = authorized.id;
  // Act: retrieve own profile by id
  const output = await api.functional.multiUserTodo.member.profiles.at(
    memberConnection,
    { profileId },
  );
  typia.assert(output);
  // Assert: ownership and core fields
  TestValidator.equals("profile id matches requested id", output.id, profileId);
  TestValidator.equals("profile is not soft-deleted", output.deleted_at, null);
  TestValidator.equals(
    "own profile user id matches join token principal",
    output.multi_user_todo_user_id,
    authorized.multi_user_todo_user_id,
  );
}
