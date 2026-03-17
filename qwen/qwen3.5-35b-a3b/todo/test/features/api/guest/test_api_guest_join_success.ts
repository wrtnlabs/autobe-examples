import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput: IMultiUserTodoAppGuest.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<
      string & tags.MinLength<6> & tags.MaxLength<1000>
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  const output: IMultiUserTodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    { body: joinInput },
  );
  typia.assert(output);
  TestValidator.predicate(
    "guest id is valid uuid",
    output.id !== null && output.id !== undefined,
  );
  typia.assert(output.token);
  TestValidator.predicate(
    "access token present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    output.token.expired_at !== null && output.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    output.token.refreshable_until !== null &&
      output.token.refreshable_until !== undefined,
  );
}