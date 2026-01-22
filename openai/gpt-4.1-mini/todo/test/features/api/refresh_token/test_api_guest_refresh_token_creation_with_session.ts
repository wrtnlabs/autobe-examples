import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestSession";
import type { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { prepare_random_todo_app_refresh_token } from "../../../prepare/prepare_random_todo_app_refresh_token";
import { prepare_random_todo_app_guest_session } from "../../../prepare/prepare_random_todo_app_guest_session";
import { generate_random_todo_app_guests_sessions_create } from "../../../generate/generate_random_todo_app_guests_sessions_create";
import { generate_random_todo_app_guest_refresh_tokens_create } from "../../../generate/generate_random_todo_app_guest_refresh_tokens_create";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_refresh_token_creation_with_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate guest user by joining
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        guestIdentifier: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  typia.assert(guestAuthorized);
  // Step 2: Generate a guest session linked to the guest ID
  const session: ITodoAppGuestSession =
    await generate_random_todo_app_guests_sessions_create(guestConnection, {
      params: { guestId: guestAuthorized.id },
      body: {
        accessToken: guestAuthorized.token.access,
        refreshToken: guestAuthorized.token.refresh,
        expiresAt: guestAuthorized.token.expired_at,
        ip: null,
        userAgent: null,
        deviceInfo: null,
      },
    });
  typia.assert(session);
  TestValidator.equals(
    "session linked to guest",
    session.guest_id,
    guestAuthorized.id,
  );
  // Step 3: Create a refresh token associated with the guest session
  const refreshTokenBody: ITodoAppRefreshToken.ICreate = {
    refresh_token: guestAuthorized.token.refresh,
    user_id: null,
    user_session_id: null,
    expired_at: session.expired_at ?? guestAuthorized.token.refreshable_until,
  } satisfies ITodoAppRefreshToken.ICreate;
  const refreshToken: ITodoAppRefreshToken =
    await generate_random_todo_app_guest_refresh_tokens_create(
      guestConnection,
      {
        body: refreshTokenBody,
      },
    );
  typia.assert(refreshToken);
  // Validate that the refresh token string matches the requested refresh token
  TestValidator.equals(
    "refresh token string matches",
    refreshToken.refresh_token,
    refreshTokenBody.refresh_token,
  );
  TestValidator.predicate(
    "refresh token expiration valid",
    new Date(refreshToken.expired_at) > new Date(),
  );
}
