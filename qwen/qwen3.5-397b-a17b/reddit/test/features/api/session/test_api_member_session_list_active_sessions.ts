import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_session_list_active_sessions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Call PATCH /redditClone/member/sessions with empty body (default parameters)
  const response = await api.functional.redditClone.member.sessions.index(
    memberConnection,
    {
      body: {} satisfies IRedditCloneMemberSession.IRequest,
    },
  );
  typia.assert(response);
  // 3. Verify pagination metadata values
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is between 1 and 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Verify default pagination limit is 20
  TestValidator.equals("default limit is 20", response.pagination.limit, 20);
  // 5. Verify pagination pages calculation is correct
  const expectedPages = Math.ceil(
    response.pagination.records / response.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation is correct",
    response.pagination.pages,
    expectedPages,
  );
  // 6. Verify each session belongs to authenticated member and is non-expired
  for (const session of response.data) {
    // Verify session belongs to authenticated member
    TestValidator.equals(
      "session belongs to authenticated member",
      session.member.id,
      authorized.id,
    );
    // Verify session is non-expired (expired_at is in the future)
    const expiredAt = new Date(session.expired_at);
    const now = new Date();
    TestValidator.predicate("session is not expired", expiredAt > now);
  }
  // 7. Verify default sorting is by created_at descending (newest first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentSession = response.data[i];
      const nextSession = response.data[i + 1];
      const currentTime = new Date(currentSession.created_at).getTime();
      const nextTime = new Date(nextSession.created_at).getTime();
      TestValidator.predicate(
        "sessions sorted by created_at desc",
        currentTime >= nextTime,
      );
    }
  }
}