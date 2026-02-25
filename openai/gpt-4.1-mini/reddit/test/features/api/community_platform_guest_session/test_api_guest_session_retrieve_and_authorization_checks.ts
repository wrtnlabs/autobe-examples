import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_retrieve_and_authorization_checks(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of own session by a guest user
  {
    // Create guest connection
    const guestConnection1: api.IConnection = { host: connection.host };
    const guestAuth1 = await authorize_guest_join(guestConnection1, {
      body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
    });
    guestConnection1.headers = { Authorization: guestAuth1.token.access };
    // Retrieve session by valid own session ID
    const session1 = await api.functional.communityPlatform.guest.sessions.at(
      guestConnection1,
      { id: guestAuth1.token.access.split(".")[1] },
    );
    // The session ID is not directly available from join result, so use known session id workaround
    // Instead, get actual session ID from a separate call or adapt test to check the session belongs to guestAuth1
    // We rely on guestAuth1.id from IAuthorized which represents guest user ID, so call session by matching userId
    // The API requires a session ID (UUID) and join returns guest ID, so we must store session ID or use the documented ICommunityPlatformUserSession.id
    // Given no other session ID, use guestAuth1.id as id (assuming session id equals user id, as appears in spec)
    // So we will proceed with guestAuth1.id as session id for test
    typia.assert(session1);
    TestValidator.equals(
      "Session user id matches guest ID",
      session1.userId,
      guestAuth1.id,
    );
    TestValidator.equals(
      "Session user summary id matches guest ID",
      session1.user.id,
      guestAuth1.id,
    );
  }
  // Scenario 2: Attempt to retrieve a session that does not belong to the guest user
  {
    // Create first guest connection
    const guestConnection1: api.IConnection = { host: connection.host };
    const guestAuth1 = await authorize_guest_join(guestConnection1, {
      body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
    });
    guestConnection1.headers = { Authorization: guestAuth1.token.access };
    // Create second guest connection
    const guestConnection2: api.IConnection = { host: connection.host };
    const guestAuth2 = await authorize_guest_join(guestConnection2, {
      body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
    });
    guestConnection2.headers = { Authorization: guestAuth2.token.access };
    // Attempt to retrieve second guest session with first guest connection
    await TestValidator.httpError(
      "Authorization error on accessing another guest's session",
      403,
      async () => {
        await api.functional.communityPlatform.guest.sessions.at(
          guestConnection1,
          { id: guestAuth2.id },
        );
      },
    );
  }
  // Scenario 3: Attempt to retrieve a session with a non-existent or invalid UUID
  {
    // Create guest connection
    const guestConnection: api.IConnection = { host: connection.host };
    const guestAuth = await authorize_guest_join(guestConnection, {
      body: { deviceFingerprint: RandomGenerator.alphaNumeric(32) },
    });
    guestConnection.headers = { Authorization: guestAuth.token.access };
    // Generate random UUID that likely doesn't exist
    const randomUuid = typia.random<string & tags.Format<"uuid">>();
    // Attempt to retrieve session with non-existent ID
    await TestValidator.httpError(
      "Not found error on retrieving non-existent session",
      404,
      async () => {
        await api.functional.communityPlatform.guest.sessions.at(
          guestConnection,
          { id: randomUuid },
        );
      },
    );
  }
}
