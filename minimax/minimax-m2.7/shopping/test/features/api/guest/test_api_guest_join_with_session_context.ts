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

export async function test_api_guest_join_with_session_context(
  connection: api.IConnection,
): Promise<void> {
  // Generate complete session context with all required and optional fields
  const fingerprint = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const user_agent = RandomGenerator.name();
  // Call guest join with complete session context
  const output = await api.functional.ecommerceMall.auth.guest.join(
    connection,
    {
      body: {
        fingerprint,
        href,
        ip,
        referrer,
        user_agent,
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  // Validate response structure
  typia.assert(output);
  // Validate guest ID is a valid UUID
  TestValidator.predicate(
    "guest ID is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  // Validate JWT tokens are present and non-empty
  TestValidator.predicate(
    "access token is non-empty string",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    output.token.refresh.length > 0,
  );
  // Validate expiration timestamps
  TestValidator.predicate(
    "expired_at is valid date-time string",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time string",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
  // Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(output.token.refreshable_until) >
      new Date(output.token.expired_at),
  );
}
