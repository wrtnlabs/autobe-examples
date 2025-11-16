import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModeratorSession";

export async function test_api_moderator_session_detail_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for testing
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorCreate = {
    username: RandomGenerator.name(1).replace(/[^a-zA-Z0-9]/g, ""),
    email: moderatorEmail,
    password_hash: typia.random<string>(),
    moderation_level: "full",
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreate,
  });
  typia.assert(moderator);

  // Step 2: Create administrative session to retrieve details about
  const sessionCreate = {
    ip: "192.168.1.100",
    href: "/economicDiscussion/moderator/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IEconomicDiscussionModeratorSession.ICreate;

  const session =
    await api.functional.economicDiscussion.moderator.moderators.sessions.create(
      connection,
      {
        moderatorId: moderator.id,
        body: sessionCreate,
      },
    );
  typia.assert(session);

  // Step 3: Retrieve detailed session information
  const sessionDetail =
    await api.functional.economicDiscussion.moderator.moderators.sessions.at(
      connection,
      {
        moderatorId: moderator.id,
        sessionId: session.id,
      },
    );
  typia.assert(sessionDetail);

  // Step 4: Validate session detail accuracy
  TestValidator.equals("session id matches", sessionDetail.id, session.id);
  TestValidator.equals(
    "session ip matches",
    sessionDetail.ip,
    sessionCreate.ip,
  );
  TestValidator.equals(
    "session href matches",
    sessionDetail.href,
    sessionCreate.href,
  );
  TestValidator.equals(
    "session referrer matches",
    sessionDetail.referrer,
    sessionCreate.referrer,
  );
  TestValidator.equals(
    "session moderator id matches",
    sessionDetail.moderator.id,
    moderator.id,
  );
  TestValidator.equals(
    "session moderator username matches",
    sessionDetail.moderator.username,
    moderator.username,
  );
  TestValidator.equals(
    "session moderator email verified matches",
    sessionDetail.moderator.email_verified,
    moderator.email_verified,
  );
  TestValidator.equals(
    "session moderator two factor enabled matches",
    sessionDetail.moderator.two_factor_enabled,
    moderator.two_factor_enabled,
  );
  TestValidator.equals(
    "session moderator moderation level matches",
    sessionDetail.moderator.moderation_level,
    moderator.moderation_level,
  );
  TestValidator.equals(
    "session creation timestamp matches",
    sessionDetail.created_at,
    session.created_at,
  );
}
