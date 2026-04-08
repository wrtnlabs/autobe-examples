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

export async function test_api_member_registration_success_returns_tokens_and_profile(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const display_name = RandomGenerator.name();
  const password = typia.random<
    string & tags.MinLength<1> & tags.Format<"password">
  >();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const joined = await authorize_member_join(memberConnection, {
    body: {
      display_name,
      password,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoUserProfile.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals(
    "profile display_name matches request",
    joined.display_name,
    display_name,
  );
  TestValidator.equals("profile is not deleted", joined.deleted_at, null);
  TestValidator.predicate(
    "access token is non-empty",
    joined.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    joined.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expires before or at refreshable_until",
    new Date(joined.token.expired_at).getTime() <=
      new Date(joined.token.refreshable_until).getTime(),
  );
  // Security: password must not appear in any response field.
  TestValidator.predicate(
    "password does not appear in response",
    JSON.stringify(joined).includes(password) === false,
  );
}
