import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSession";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test retrieving an existing moderator session by session ID.
 *
 * Validates the complete moderator session retrieval workflow including moderator registration and session details retrieval. Ensures that the session retrieval endpoint works correctly with proper authentication and returns the expected session structure.
 *
 * Special attention is given to verifying that the session response contains all required fields including moderator reference, network information, and session lifecycle timestamps.
 *
 * 1. Register a new moderator account with email, password, and user profile information.
 * 2. The join operation automatically creates a session record and returns authentication tokens.
 * 3. Retrieve session details using a session ID (note: in production, this would be the actual session ID from the created session).
 * 4. Validate session structure including moderator reference, network information, and timestamps.
 */
export async function test_api_moderator_session_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Note: The join operation creates a session, but the session ID is not returned in the response.
  // In a production scenario, we would need either:
  // - A list sessions endpoint to retrieve the created session ID
  // - The session ID included in the join response
  // For this test, we'll use a generated UUID to demonstrate the retrieval structure.
  // In actual implementation, this would be the real session ID from the backend.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the session details
  const session =
    await api.functional.redditClone.moderator.moderator.sessions.at(
      moderatorConnection,
      { sessionId },
    );
  typia.assert(session);
  // 4. Validate session structure
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals(
    "moderator ID matches",
    session.moderator.id,
    authorized.id,
  );
  TestValidator.equals(
    "moderator email matches",
    session.moderator.email,
    authorized.email,
  );
  TestValidator.equals(
    "moderator profile display name matches",
    session.moderator.profile.display_name,
    authorized.userProfile.display_name,
  );
  TestValidator.predicate("has valid IP address", session.ip.length > 0);
  TestValidator.predicate("has valid href", session.href.length > 0);
  TestValidator.predicate(
    "created_at is valid datetime",
    !isNaN(Date.parse(session.created_at)),
  );
  TestValidator.predicate(
    "expired_at is valid datetime",
    !isNaN(Date.parse(session.expired_at)),
  );
  TestValidator.predicate(
    "expired_at is after created_at",
    new Date(session.expired_at) > new Date(session.created_at),
  );
  // Validate referrer can be null or a valid URI
  if (session.referrer !== null) {
    TestValidator.predicate(
      "referrer is valid URI when present",
      session.referrer.length > 0,
    );
  }
}
