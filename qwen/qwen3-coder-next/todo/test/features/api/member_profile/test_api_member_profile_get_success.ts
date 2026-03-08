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

export async function test_api_member_profile_get_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Get profile with authenticated connection
  const profile =
    await api.functional.todoApp.member.profile.at(memberConnection);
  typia.assert(profile);
  // Step 3: Validate profile contains expected non-empty fields
  TestValidator.equals(
    "profile has non-empty display_name",
    profile.display_name.length > 0,
    true,
  );
  TestValidator.predicate(
    "profile has valid UUID format",
    /^[0-9a-f-]{36}$/i.test(profile.id),
  );
  TestValidator.predicate(
    "profile has non-empty created_at",
    profile.created_at.length > 0,
  );
  TestValidator.predicate(
    "profile has non-empty updated_at",
    profile.updated_at.length > 0,
  );
}
