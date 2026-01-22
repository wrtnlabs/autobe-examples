import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_token_refresh_with_valid_refresh_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new guest connection and join as a guest user
  const guestConnection: api.IConnection = { host: connection.host };
  const joined: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        guestIdentifier: RandomGenerator.alphaNumeric(16),
      } satisfies ITodoAppGuest.IJoin,
    },
  );
  typia.assert(joined);
  // Step 2: Create a new connection for the refresh operation
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed: ITodoAppGuest.IAuthorized = await authorize_guest_refresh(
    refreshConnection,
    {
      body: { id: joined.id } satisfies ITodoAppGuest.IRefresh,
    },
  );
  typia.assert(refreshed);
  // Step 3: Validate that the refreshed guest matches the joined guest
  TestValidator.equals(
    "refreshed guest id matches joined guest id",
    refreshed.id,
    joined.id,
  );
  // Step 4: Validate that token contains access and refresh strings
  TestValidator.predicate(
    "refresh response contains access token",
    typeof refreshed.token.access === "string" &&
      refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh response contains refresh token",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );
  // Step 5: Confirm connection header is updated with new access token
  TestValidator.predicate(
    "refresh connection has updated Authorization header",
    refreshConnection.headers !== undefined &&
      refreshConnection.headers.Authorization === refreshed.token.access,
  );
  // Step 6: Validate guestIdentifier consistency and timestamps
  TestValidator.equals(
    "refreshed guestIdentifier matches joined guestIdentifier",
    refreshed.guestIdentifier,
    joined.guestIdentifier,
  );
  TestValidator.predicate(
    "joined createdAt is ISO date string",
    typeof joined.createdAt === "string" && joined.createdAt.length > 0,
  );
  TestValidator.predicate(
    "refreshed createdAt is ISO date string",
    typeof refreshed.createdAt === "string" && refreshed.createdAt.length > 0,
  );
}
