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

export async function test_api_member_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register new member using utility function
  const email = typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>());
  const authResult = await authorize_member_join(connection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
      referrer: typia.assert<string & tags.Format<"uri">>(typia.random<string & tags.Format<"uri">>()),
    } satisfies ITodoAppMemberSession.IJoin,
  });
  typia.assert(authResult);
  // Step 2: Create authenticated connection with token from result
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: authResult.token.access,
  };
  // Step 3: Retrieve own profile
  const profile = await api.functional.todoApp.member.profile.at(
    authenticatedConnection,
  );
  typia.assert(profile);
  // Step 4: Validate profile belongs to authenticated user
  TestValidator.equals(
    "profile ID matches authenticated user",
    profile.id,
    authResult.member.id,
  );
  TestValidator.predicate(
    "display name is non-empty",
    profile.display_name.length > 0,
  );
}