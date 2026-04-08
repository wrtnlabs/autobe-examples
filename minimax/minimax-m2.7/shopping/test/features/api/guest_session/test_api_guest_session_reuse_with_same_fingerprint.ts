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

export async function test_api_guest_session_reuse_with_same_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a consistent fingerprint for testing session reuse
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const body = {
    fingerprint,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  // 1. First guest join request with the fingerprint
  const firstJoin = await api.functional.ecommerceMall.auth.guest.join(
    connection,
    { body },
  );
  typia.assert(firstJoin);
  // 2. Second guest join request with the SAME fingerprint
  // This should reuse the existing guest session, not create a new one
  const secondJoin = await api.functional.ecommerceMall.auth.guest.join(
    connection,
    { body },
  );
  typia.assert(secondJoin);
  // 3. Validate that both requests returned the same guest ID
  // This confirms the system reuses existing guest record when same fingerprint is provided
  TestValidator.equals(
    "Guest ID should be reused when same fingerprint is provided",
    firstJoin.id,
    secondJoin.id,
  );
  // 4. Validate that both requests returned valid authorization tokens
  TestValidator.predicate(
    "First request should have access token",
    firstJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "First request should have refresh token",
    firstJoin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Second request should have access token",
    secondJoin.token.access.length > 0,
  );
  TestValidator.predicate(
    "Second request should have refresh token",
    secondJoin.token.refresh.length > 0,
  );
  // 5. Validate token structure
  TestValidator.predicate(
    "First request token should have expiration",
    firstJoin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "First request token should have refreshable_until",
    firstJoin.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "Second request token should have expiration",
    secondJoin.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "Second request token should have refreshable_until",
    secondJoin.token.refreshable_until.length > 0,
  );
}
