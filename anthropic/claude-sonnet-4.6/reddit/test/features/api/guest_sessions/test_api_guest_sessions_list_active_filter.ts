import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import type { ICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMemberSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_sessions_list_active_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest identity with a unique fingerprint and obtain JWT
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuthorized);
  // Step 2: Filter with active=true — only non-expired sessions
  const activeResult = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {
        active: true,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(activeResult);
  // Validate pagination has at least 1 record (our fresh session)
  TestValidator.predicate(
    "active sessions count >= 1",
    activeResult.pagination.records >= 1,
  );
  // All active sessions must have expired_at strictly in the future
  const nowAfterActiveCall = new Date();
  for (const session of activeResult.data) {
    TestValidator.predicate(
      "active session expired_at is in the future",
      new Date(session.expired_at) > nowAfterActiveCall,
    );
  }
  // Step 3: Filter with active=false — only expired sessions
  // Since we just created a fresh session, there are no expired sessions for this guest
  const inactiveResult = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {
        active: false,
      } satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(inactiveResult);
  // Fresh guest should have no expired sessions
  TestValidator.equals(
    "no expired sessions for fresh guest",
    inactiveResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "expired sessions data is empty",
    inactiveResult.data.length,
    0,
  );
  // Step 4: Filter with active omitted — all sessions returned
  const allResult = await api.functional.community.guest.sessions.index(
    guestConnection,
    {
      body: {} satisfies ICommunityMemberSession.IRequest,
    },
  );
  typia.assert(allResult);
  // Must have at least 1 record (the fresh session)
  TestValidator.predicate(
    "all sessions count >= 1",
    allResult.pagination.records >= 1,
  );
  // The count of all sessions must be >= count of active sessions
  TestValidator.predicate(
    "all sessions >= active sessions count",
    allResult.pagination.records >= activeResult.pagination.records,
  );
}
