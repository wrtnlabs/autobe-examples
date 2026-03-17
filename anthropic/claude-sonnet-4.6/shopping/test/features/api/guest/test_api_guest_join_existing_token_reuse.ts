import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_existing_token_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique fingerprint token to be reused across both join calls
  const fingerprintToken = RandomGenerator.alphaNumeric(32);
  // --- First Join ---
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResponse = await authorize_guest_join(firstConnection, {
    body: {
      token: fingerprintToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstResponse);
  // --- Second Join with the same fingerprint token but different session context ---
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResponse = await authorize_guest_join(secondConnection, {
    body: {
      token: fingerprintToken,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "https://referrer.example.com/page",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondResponse);
  // Validate: The guest record ID must be the same (reused, not duplicated)
  TestValidator.equals(
    "guest record id is reused on second join",
    secondResponse.id,
    firstResponse.id,
  );
  // Validate: The fingerprint token in both responses must match the submitted token
  TestValidator.equals(
    "guest.token matches submitted fingerprint (first response)",
    firstResponse.guest.token,
    fingerprintToken,
  );
  TestValidator.equals(
    "guest.token matches submitted fingerprint (second response)",
    secondResponse.guest.token,
    fingerprintToken,
  );
  // Validate: New access token issued on second join (different from first)
  TestValidator.notEquals(
    "new access token issued on second join",
    secondResponse.token.access,
    firstResponse.token.access,
  );
  // Validate: New refresh token issued on second join (different from first)
  TestValidator.notEquals(
    "new refresh token issued on second join",
    secondResponse.token.refresh,
    firstResponse.token.refresh,
  );
  // Validate: The second response's sessions should contain at least 2 records
  TestValidator.predicate(
    "second response has at least 2 sessions",
    secondResponse.sessions.length >= 2,
  );
  // Validate: The guest record created_at matches the first join (not refreshed)
  TestValidator.equals(
    "guest created_at is preserved from first join",
    secondResponse.guest.created_at,
    firstResponse.guest.created_at,
  );
  // Validate: token.expired_at must be a future timestamp
  TestValidator.predicate(
    "token expired_at is in the future",
    new Date(secondResponse.token.expired_at) > new Date(),
  );
}
