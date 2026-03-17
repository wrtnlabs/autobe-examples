import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for guest join
  const joinConnection: api.IConnection = { host: connection.host };
  // Register new guest account with valid credentials
  const output: IEcommerceMallGuest.IAuthorized = await authorize_guest_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        user_agent: RandomGenerator.paragraph(),
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  typia.assert(output);
  // Validate response structure contains id and token
  TestValidator.equals("guest id is UUID format", output.id, output.id);
  typia.assert(output.token);
  const token: IAuthorizationToken = output.token;
  // Validate token has all required fields
  TestValidator.equals("access token exists", token.access.length > 0, true);
  TestValidator.equals("refresh token exists", token.refresh.length > 0, true);
  TestValidator.equals("expired_at exists", token.expired_at.length > 0, true);
  TestValidator.equals(
    "refreshable_until exists",
    token.refreshable_until.length > 0,
    true,
  );
  // Validate expiration times: access < 15 min, refresh < 7 days
  const accessExpiredAt = new Date(token.expired_at);
  const refreshableUntil = new Date(token.refreshable_until);
  const now = new Date();
  const accessTokenDuration =
    (accessExpiredAt.getTime() - now.getTime()) / (1000 * 60);
  const refreshTokenDuration =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 24);
  TestValidator.equals(
    "access token expires within 15 minutes",
    accessTokenDuration > 0 && accessTokenDuration <= 15,
    true,
  );
  TestValidator.equals(
    "refresh token expires within 7 days",
    refreshTokenDuration > 0 && refreshTokenDuration <= 7,
    true,
  );
  // Validate expired_at before refreshable_until
  TestValidator.predicate(
    "access token expires before refresh deadline",
    () => accessExpiredAt.getTime() < refreshableUntil.getTime(),
  );
}