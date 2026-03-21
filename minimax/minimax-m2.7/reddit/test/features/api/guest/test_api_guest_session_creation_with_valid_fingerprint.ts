import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation_with_valid_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create guest session using utility function
  const authorized = await authorize_guest_join(connection, {});
  typia.assert(authorized);
  // Step 2: Validate token structure (typia.assert validates the complete structure)
  const token = authorized.token;
  typia.assert(token);
  // Step 3: Validate business logic - refreshable_until should be after expired_at
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    new Date(token.refreshable_until) > new Date(token.expired_at),
  );
  // Step 4: Create new connection with access token for authenticated guest calls
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // Verify the connection has Authorization header set from the join operation
  TestValidator.predicate(
    "connection should have Authorization header after guest join",
    guestConnection.headers !== undefined &&
      guestConnection.headers.Authorization !== undefined &&
      typeof guestConnection.headers.Authorization === "string" &&
      guestConnection.headers.Authorization.length > 0,
  );
}