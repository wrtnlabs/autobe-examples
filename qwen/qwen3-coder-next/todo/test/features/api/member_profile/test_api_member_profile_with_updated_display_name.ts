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

export async function test_api_member_profile_with_updated_display_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member
  const registerConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>() as any as string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppMemberSession.IJoin;
  const registered = await authorize_member_join(registerConnection, {
    body: joinInput,
  });
  typia.assert(registered);
  // 2. Update display name
  const updatedDisplayName = RandomGenerator.name();
  const updateInput = {
    display_name: updatedDisplayName,
  } satisfies ITodoAppProfile.IUpdate;
  const updatedProfile = await api.functional.todoApp.member.profile.put(
    registerConnection,
    {
      body: updateInput,
    },
  );
  typia.assert(updatedProfile);
  // 3. Retrieve profile
  const retrievedProfile =
    await api.functional.todoApp.member.profile.at(registerConnection);
  typia.assert(retrievedProfile);
  // 4. Verify updated display name matches
  TestValidator.equals(
    "display name matches",
    retrievedProfile.display_name,
    updatedDisplayName,
  );
  // 5. Verify all required fields are present (typia.assert handles type validation)
  TestValidator.predicate(
    "has valid id format",
    /^[0-9a-f-]{36}$/i.test(retrievedProfile.id),
  );
}