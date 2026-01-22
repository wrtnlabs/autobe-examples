import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_session_refresh(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Step 1: Create initial guest session by joining
  const initialGuest: ITodoListGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {} satisfies ITodoListGuest.IJoin,
    },
  );
  typia.assert(initialGuest);
  // Step 2: Refresh guest session using the same guestConnection
  const refreshedGuest: ITodoListGuest.IAuthorized =
    await authorize_guest_refresh(guestConnection, {
      body: {} satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(refreshedGuest);
  // Verify session was refreshed - new tokens were generated
  TestValidator.notEquals(
    "refreshed token access differs from initial",
    initialGuest.token.access,
    refreshedGuest.token.access,
  );
  TestValidator.notEquals(
    "refreshed token refresh differs from initial",
    initialGuest.token.refresh,
    refreshedGuest.token.refresh,
  );
  // Verify guest identity remains unchanged
  TestValidator.equals(
    "guest id unchanged after refresh",
    initialGuest.id,
    refreshedGuest.id,
  );
  TestValidator.equals(
    "guest created_at unchanged after refresh",
    initialGuest.createdAt,
    refreshedGuest.createdAt,
  );
  TestValidator.equals(
    "guest isActive unchanged after refresh",
    initialGuest.isActive,
    refreshedGuest.isActive,
  );
}
