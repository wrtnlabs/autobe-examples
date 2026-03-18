import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_join_authorized_session_creation(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const rawEmail = `${RandomGenerator.alphabets(8)}.${RandomGenerator.alphabets(6)}@EXAMPLE.COM`;
  const password = RandomGenerator.alphaNumeric(16);
  const body = {
    email: rawEmail,
    password,
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingOwner.IJoin;
  const authorized = await authorize_owner_join(ownerConnection, {
    body,
  });
  typia.assert(authorized);
  typia.assert<IAuthorizationToken>(authorized.token);
  TestValidator.equals(
    "normalized owner email",
    authorized.email,
    rawEmail.toLowerCase(),
  );
  TestValidator.notEquals(
    "access and refresh tokens differ",
    authorized.token.access,
    authorized.token.refresh,
  );
  TestValidator.equals(
    "authenticated connection authorization header matches access token",
    ownerConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.predicate(
    "refresh window is not earlier than access expiration",
    new Date(authorized.token.refreshable_until).getTime() >=
      new Date(authorized.token.expired_at).getTime(),
  );
  TestValidator.predicate(
    "password is not exposed in serialized response",
    !JSON.stringify(authorized).includes(password),
  );
}
