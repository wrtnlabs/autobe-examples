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

export async function test_api_guest_join_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique fingerprint for guest identity
  const fingerprint = RandomGenerator.alphaNumeric(16);
  // Generate required URI fields for session context
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Call the guest join endpoint
  const guest: IEcommerceMallGuest.IAuthorized =
    await api.functional.ecommerceMall.auth.guest.join(connection, {
      body: {
        fingerprint,
        href,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer,
        user_agent: RandomGenerator.name(),
      } satisfies IEcommerceMallGuest.IJoin,
    });
  // Validate response structure and required fields
  typia.assert(guest);
  // Verify guest ID is a valid UUID
  TestValidator.predicate(
    "guest ID is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      guest.id,
    ),
  );
  // Verify authorization token exists
  TestValidator.predicate(
    "authorization token is present",
    guest.token !== null && guest.token !== undefined,
  );
  // Verify access token is present and non-empty
  TestValidator.predicate(
    "access token exists and is non-empty",
    guest.token.access !== null &&
      guest.token.access !== undefined &&
      guest.token.access.length > 0,
  );
  // Verify refresh token is present and non-empty
  TestValidator.predicate(
    "refresh token exists and is non-empty",
    guest.token.refresh !== null &&
      guest.token.refresh !== undefined &&
      guest.token.refresh.length > 0,
  );
  // Verify expiration timestamp is present
  TestValidator.predicate(
    "access token expiration timestamp is present",
    guest.token.expired_at !== null && guest.token.expired_at !== undefined,
  );
  // Verify refreshable until timestamp is present
  TestValidator.predicate(
    "refreshable until timestamp is present",
    guest.token.refreshable_until !== null &&
      guest.token.refreshable_until !== undefined,
  );
}