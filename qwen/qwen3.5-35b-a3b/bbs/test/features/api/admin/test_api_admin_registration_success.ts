import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new admin account with valid credentials
  const joinConnection: api.IConnection = { host: connection.host };
  const response = await authorize_admin_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  // 2. Validate response structure (typia.assert validates all fields)
  typia.assert(response);
  // 3. Validate token expiration timestamps are valid date-time format
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(response.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(response.token.refreshable_until)),
  );
  // 4. Validate refreshable_until is after expired_at (session can be extended)
  const expiredAt = new Date(response.token.expired_at);
  const refreshableUntil = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
  // 5. Validate access and refresh tokens are non-empty strings
  TestValidator.predicate(
    "access token is non-empty",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    response.token.refresh.length > 0,
  );
  // 6. Validate user ID is non-empty (UUID format validated by typia.assert)
  TestValidator.predicate("user ID is non-empty", response.id.length > 0);
}
