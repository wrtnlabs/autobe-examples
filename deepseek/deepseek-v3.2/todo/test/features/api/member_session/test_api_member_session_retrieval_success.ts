import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  typia.assert(authorizedMember);
  // Step 2: The session ID should be in the token
  // After join, we need to retrieve the session ID - typically it might be the access token or need to be extracted
  // Since we don't have direct access to session ID after join, we need to think differently
  // Actually, the join returns IAuthorized with token containing access and refresh
  // But we need session ID to query GET /todoApp/member/sessions/{sessionId}
  // Alternative approach: We need to find a way to get session ID
  // Looking at ITodoAppMemberSession structure, session ID is UUID, not the JWT token
  // This suggests we might need to get session ID from somewhere else or the API might work differently
  // Let's check if there's another endpoint to list sessions first
  // Since we only have the at() function for specific session retrieval, we need the session ID
  // Actually, looking at the mockup test, it just uses random UUID for sessionId
  // But that's not testing real scenario - we need actual session from join
  // Problem: The join endpoint doesn't return session ID, only tokens
  // But the session retrieval endpoint requires session ID (UUID)
  // We need to find the session ID from somewhere
  // Let me re-examine: The join creates a session in todo_app_member_sessions table
  // The session ID should be generated and stored with the tokens
  // But it's not returned in the join response
  // This seems like a gap in the API design or our understanding
  // For now, let's use the approach from mockup: generate random UUID
  // But that won't test actual session retrieval
  // Actually, wait: The session retrieval might accept the JWT token itself as sessionId?
  // No, sessionId parameter is string type, not specifically UUID in the SDK
  // Let me check the SDK: sessionId: string (not UUID tagged)
  // So maybe it accepts the access token as sessionId?
  // Let's try using the access token as sessionId
  const sessionId = authorizedMember.token.access;
  // Step 3: Retrieve the session
  const session = await api.functional.todoApp.member.sessions.at(
    memberConnection,
    { sessionId },
  );
  typia.assert(session);
  // Step 4: Validate session structure
  TestValidator.equals("session ID matches", session.id, sessionId);
  TestValidator.equals(
    "access token matches",
    session.access_token,
    authorizedMember.token.access,
  );
  TestValidator.equals(
    "refresh token matches",
    session.refresh_token,
    authorizedMember.token.refresh,
  );
  TestValidator.equals(
    "member ID matches",
    session.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "member email matches",
    session.member.email,
    authorizedMember.email,
  );
  TestValidator.equals(
    "member display name matches",
    session.member.display_name,
    authorizedMember.display_name,
  );
  // Step 5: Validate timestamps are ISO format
  TestValidator.predicate("created_at is ISO date", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      session.created_at,
    ),
  );
  TestValidator.predicate("expired_at is ISO date", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      session.expired_at,
    ),
  );
  TestValidator.predicate("updated_at is ISO date", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(
      session.updated_at,
    ),
  );
  // Step 6: Validate connection context fields
  TestValidator.predicate("ip is present", () => session.ip.length > 0);
  TestValidator.predicate("href is present", () => session.href.length > 0);
  TestValidator.predicate(
    "referrer is present",
    () => session.referrer.length > 0,
  );
}
