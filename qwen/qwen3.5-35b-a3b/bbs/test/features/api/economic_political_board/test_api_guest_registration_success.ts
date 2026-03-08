import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const displayName = RandomGenerator.name();
  // Create actor-specific connection for registration
  const joinConnection: api.IConnection = { host: connection.host };
  // Register new guest user with required session context
  const output = await authorize_guest_join(joinConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardGuest.IJoin,
  });
  // Validate response structure completely
  typia.assert(output);
  // Verify user ID is valid UUID format
  TestValidator.predicate(
    "user ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate("user ID not empty", output.id.length > 0);
  // Validate token structure - already validated by typia.assert(output)
  TestValidator.predicate(
    "access token not empty",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      output.token.refreshable_until,
    ),
  );
  // Verify expiration timestamps are present and match
  TestValidator.equals(
    "expired_at matches token",
    output.expired_at,
    output.token.expired_at,
  );
}
