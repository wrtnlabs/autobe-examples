import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMemberSession";
import { prepare_random_community_bbs_member } from "../../../prepare/prepare_random_community_bbs_member";
import { generate_random_community_bbs_member_member_sessions_create } from "../../../generate/generate_random_community_bbs_member_member_sessions_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_member_session_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to create session context
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a member session using the authenticated member connection
  // This generates a session_token for the member that we'll retrieve later
  const session: ICommunityBbsMemberSession =
    await generate_random_community_bbs_member_member_sessions_create(
      memberConnection,
      {},
    );
  typia.assert(session);
  // Step 3: Validate that the session data contains expected properties
  TestValidator.equals(
    "session has correct member_id",
    session.member_id,
    member.id,
  );
  TestValidator.predicate(
    "session_token is a string",
    typeof session.session_token === "string",
  );
  TestValidator.predicate(
    "ip_address is valid IPv4",
    typeof session.ip_address === "string",
  );
  TestValidator.predicate(
    "user_agent is a string",
    typeof session.user_agent === "string",
  );
  TestValidator.predicate(
    "created_at is ISO 8601 date-time",
    typeof session.created_at === "string",
  );
  TestValidator.predicate(
    "last_activity_at is ISO 8601 date-time",
    typeof session.last_activity_at === "string",
  );
  TestValidator.predicate(
    "expires_at is ISO 8601 date-time",
    typeof session.expires_at === "string",
  );
  // Step 4: Retrieve the session by session_token using the same member connection
  // This is the target operation being tested
  const retrievedSession: ICommunityBbsMemberSession =
    await api.functional.communityBbs.member.member_sessions.at(
      memberConnection,
      {
        sessionId: session.session_token, // Correct property: session_token, not sessionId
      },
    );
  typia.assert(retrievedSession);
  // Step 5: Validate that the retrieved session matches the created session
  TestValidator.equals(
    "retrieved session matches created session",
    retrievedSession,
    session,
  );
}
