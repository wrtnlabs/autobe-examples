import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_repeat_returns_new_tokens(
  connection: api.IConnection,
): Promise<void> {
  const firstJoinConnection: api.IConnection = { host: connection.host };
  const firstJoinInput = {
    display_name: RandomGenerator.name(),
    password: typia.assert<IMultiUserTodoUserProfile.IJoin["password"]>(
      typia.random<string & tags.Format<"password">>(),
    ),
    href: "https://example.com/guest/join",
    referrer: "https://example.com/",
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const first = await authorize_guest_join(firstJoinConnection, {
    body: firstJoinInput,
  });
  typia.assert(first);
  const firstAccess = first.token.access;
  const firstRefresh = first.token.refresh;
  const firstProfileId = first.id;
  const firstDisplayName = first.display_name;
  TestValidator.predicate(
    "first token.access must be non-empty",
    firstAccess.length > 0,
  );
  TestValidator.predicate(
    "first token.refresh must be non-empty",
    firstRefresh.length > 0,
  );
  TestValidator.equals("first deleted_at is null", first.deleted_at, null);
  TestValidator.predicate(
    "response must not include password",
    !("password" in first as unknown as Record<string, unknown>),
  );
  TestValidator.predicate(
    "response must not echo password input",
    !JSON.stringify(first).includes(firstJoinInput.password),
  );

  const secondJoinConnection: api.IConnection = { host: connection.host };
  const secondJoinInput = {
    display_name: RandomGenerator.name(),
    password: typia.assert<IMultiUserTodoUserProfile.IJoin["password"]>(
      typia.random<string & tags.Format<"password">>(),
    ),
    href: "https://example.com/guest/join",
    referrer: "https://example.com/",
  } satisfies IMultiUserTodoUserProfile.IJoin;
  const second = await authorize_guest_join(secondJoinConnection, {
    body: secondJoinInput,
  });
  typia.assert(second);
  const secondAccess = second.token.access;
  const secondRefresh = second.token.refresh;
  const secondProfileId = second.id;
  const secondDisplayName = second.display_name;
  TestValidator.predicate(
    "second token.access must be non-empty",
    secondAccess.length > 0,
  );
  TestValidator.predicate(
    "second token.refresh must be non-empty",
    secondRefresh.length > 0,
  );
  TestValidator.equals("second deleted_at is null", second.deleted_at, null);
  TestValidator.predicate(
    "profile id should be a non-empty uuid",
    secondProfileId.length > 0,
  );
  TestValidator.predicate(
    "display name should be non-empty",
    secondDisplayName.length > 0,
  );
  TestValidator.predicate(
    "first display name should be non-empty",
    firstDisplayName.length > 0,
  );
  TestValidator.predicate(
    "at least one token value should differ",
    firstAccess !== secondAccess || firstRefresh !== secondRefresh,
  );
  TestValidator.predicate(
    "second response must not include password",
    !("password" in second as unknown as Record<string, unknown>),
  );
  TestValidator.predicate(
    "second response must not echo second password input",
    !JSON.stringify(second).includes(secondJoinInput.password),
  );
}
