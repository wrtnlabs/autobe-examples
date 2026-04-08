import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_with_client_ip_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Test guest session creation with client IP tracking
  // Sends POST request with fingerprint, href, referrer, and optional ip field
  const result = await authorize_guest_join(connection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Validate response with typia.assert() - validates all types, formats, constraints
  typia.assert(result);
  // Validate authorization token structure - business logic validation
  TestValidator.predicate(
    "access token is non-empty string",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !isNaN(Date.parse(result.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !isNaN(Date.parse(result.token.refreshable_until)),
  );
  // Validate token expiration logic
  TestValidator.predicate(
    "access token expires before refresh window",
    new Date(result.token.expired_at) <
      new Date(result.token.refreshable_until),
  );
}
