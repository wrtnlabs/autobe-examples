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

export async function test_api_member_sessions_list_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Call GET /redditClone/member/sessions with authenticated session
  const sessionsResponse =
    await api.functional.redditClone.member.sessions.list(memberConnection);
  typia.assert(sessionsResponse);
  // 3. Verify pagination metadata structure
  TestValidator.equals(
    "has pagination metadata",
    sessionsResponse.pagination !== null,
    true,
  );
  TestValidator.predicate(
    "pagination.current is non-negative",
    sessionsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    sessionsResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    sessionsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    sessionsResponse.pagination.pages >= 0,
  );
  // 4. Verify session data array exists and has at least one session
  TestValidator.predicate(
    "has at least one session record",
    sessionsResponse.data.length >= 1,
  );
  // 5. Find the current session and verify isCurrent flag
  const currentSession = sessionsResponse.data.find(
    (session) => (session as any).isCurrent === true,
  );
  TestValidator.equals(
    "current session exists with isCurrent true",
    currentSession !== undefined,
    true,
  );
  // 6. Verify required fields exist in session data
  const firstSession = sessionsResponse.data[0] as any;
  TestValidator.predicate(
    "session id is valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      firstSession.id,
    ),
  );
  TestValidator.equals(
    "session has ip address",
    typeof firstSession.ip === "string",
    true,
  );
  TestValidator.equals(
    "session has href",
    typeof firstSession.href === "string",
    true,
  );
  TestValidator.equals(
    "session has referrer",
    typeof firstSession.referrer === "string",
    true,
  );
  TestValidator.equals(
    "session has created_at timestamp",
    firstSession.created_at !== undefined && firstSession.created_at !== null,
    true,
  );
  TestValidator.equals(
    "session has expired_at timestamp",
    firstSession.expired_at !== undefined && firstSession.expired_at !== null,
    true,
  );
}