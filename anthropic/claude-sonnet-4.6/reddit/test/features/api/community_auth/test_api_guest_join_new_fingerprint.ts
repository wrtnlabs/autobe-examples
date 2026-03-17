import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_new_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a guest-specific connection (never use base connection directly)
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Prepare unique request data
  const fingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 3. Call the guest join endpoint using the MANDATORY utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint,
      href,
      referrer,
    },
  });
  // 4. Validate the full response shape
  typia.assert(authorized);
  // 5. Business logic validations
  // Fingerprint must match what was submitted
  TestValidator.equals(
    "fingerprint matches input",
    authorized.fingerprint,
    fingerprint,
  );
  // Token fields must be non-empty
  TestValidator.predicate(
    "access token is non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty",
    authorized.token.refresh.length > 0,
  );
  // Token expiry must be in the future
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(authorized.token.expired_at) > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    new Date(authorized.token.refreshable_until) > now,
  );
  // refreshable_until must be later than expired_at (session outlasts access token)
  TestValidator.predicate(
    "refreshable_until is later than expired_at",
    new Date(authorized.token.refreshable_until) >=
      new Date(authorized.token.expired_at),
  );
}
