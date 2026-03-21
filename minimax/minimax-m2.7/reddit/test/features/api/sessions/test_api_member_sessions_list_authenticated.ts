import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_list_authenticated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  // 2. Create authenticated connection with token
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorized.token.access,
    },
  };
  // 3. Retrieve sessions list
  const sessionsResponse =
    await api.functional.redditClone.member.members.sessions.list(
      authenticatedConnection,
    );
  typia.assert(sessionsResponse);
  // 4. Validate response structure
  TestValidator.equals(
    "has pagination",
    sessionsResponse.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(sessionsResponse.data),
    true,
  );
  TestValidator.predicate("has data", sessionsResponse.data.length > 0);
  // 5. Validate pagination metadata
  const pagination = sessionsResponse.pagination;
  TestValidator.predicate("current page is valid", pagination.current >= 0);
  TestValidator.predicate("limit is valid", pagination.limit >= 0);
  TestValidator.predicate("records count is valid", pagination.records >= 0);
  TestValidator.predicate("pages count is valid", pagination.pages >= 0);
  // 6. Validate each session has required fields and no sensitive tokens
  for (const session of sessionsResponse.data) {
    // Required fields
    TestValidator.predicate("session has id", !!session.id);
    TestValidator.predicate("session has email", !!session.email);
    TestValidator.predicate("session has username", !!session.username);
    TestValidator.predicate("session has created_at", !!session.created_at);
    TestValidator.predicate("session has updated_at", !!session.updated_at);
    TestValidator.predicate("session has profile", !!session.profile);
    TestValidator.predicate("session has karma", !!session.karma);
    // Verify NO sensitive tokens are exposed
    TestValidator.equals(
      "no access_token in session",
      (session as any).access_token,
      undefined,
    );
    TestValidator.equals(
      "no refresh_token in session",
      (session as any).refresh_token,
      undefined,
    );
    TestValidator.equals(
      "no token in session",
      (session as any).token,
      undefined,
    );
  }
  // 7. Validate sessions are ordered by created_at descending (most recent first)
  for (let i = 0; i < sessionsResponse.data.length - 1; i++) {
    const current = new Date(sessionsResponse.data[i].created_at);
    const next = new Date(sessionsResponse.data[i + 1].created_at);
    TestValidator.predicate(
      `session[${i}] created_at >= session[${i + 1}] created_at`,
      current >= next,
    );
  }
}
