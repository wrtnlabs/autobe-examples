import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_re_registration_lifecycle_behavior(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(16);
  const password2 = RandomGenerator.alphaNumeric(16);
  // 1) First join (must use utility)
  const firstJoinConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_member_join(firstJoinConnection, {
    body: {
      email,
      password: password1,
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(firstAuthorized);
  const firstExpiredAt = new Date(firstAuthorized.token.expired_at).getTime();
  const firstRefreshableUntil = new Date(
    firstAuthorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "first token expired_at should be parseable",
    () => !Number.isNaN(firstExpiredAt),
  );
  TestValidator.predicate(
    "first token refreshable_until should be parseable",
    () => !Number.isNaN(firstRefreshableUntil),
  );
  TestValidator.predicate(
    "first token expired_at should be earlier than refreshable_until",
    () => firstExpiredAt < firstRefreshableUntil,
  );
  // 2) Second join with same email but different password
  const secondJoinConnection: api.IConnection = { host: connection.host };
  let secondAuthorized: IShoppingMallMember.IAuthorized | undefined;
  try {
    secondAuthorized = await authorize_member_join(secondJoinConnection, {
      body: {
        email,
        password: password2,
      } satisfies IShoppingMallMember.IJoin,
    });
    typia.assert(secondAuthorized);
  } catch (exp) {
    const e = exp as unknown;
    const status =
      typeof (e as { status?: unknown }).status === "number"
        ? (e as { status: number }).status
        : undefined;
    if (status === 409) {
      // Acceptable business outcome: duplicate/active-only conflict
      return;
    }
    throw exp;
  }
  // 3) When succeeds, validate token metadata ordering
  if (!secondAuthorized) throw new Error("Second join did not return data");
  const secondExpiredAt = new Date(secondAuthorized.token.expired_at).getTime();
  const secondRefreshableUntil = new Date(
    secondAuthorized.token.refreshable_until,
  ).getTime();
  TestValidator.predicate(
    "second token expired_at should be parseable",
    () => !Number.isNaN(secondExpiredAt),
  );
  TestValidator.predicate(
    "second token refreshable_until should be parseable",
    () => !Number.isNaN(secondRefreshableUntil),
  );
  TestValidator.predicate(
    "second token expired_at should be earlier than refreshable_until",
    () => secondExpiredAt < secondRefreshableUntil,
  );
}
