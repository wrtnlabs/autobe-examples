import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_pagination_multiple_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Generate stable credentials for reuse across join and login
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Step 1: Join a new member — this creates session #1
  const memberConnection1: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(memberConnection1, {
    body: {
      email,
      username: RandomGenerator.name(1),
      password,
      href,
      referrer,
    },
  });
  typia.assert(joinResult);
  // Step 2: Log in again with the same credentials — this creates session #2
  const memberConnection2: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(memberConnection2, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Fetch page 1 with limit=1
  const page1 = await api.functional.communityPlatform.member.sessions.index(
    memberConnection2,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies ICommunityPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page1);
  // Step 4: Verify page 1 contains exactly 1 session, and pagination metadata
  // indicates at least 2 total records across at least 2 pages
  TestValidator.equals("page 1 data length", page1.data.length, 1);
  TestValidator.predicate("records >= 2", page1.pagination.records >= 2);
  TestValidator.predicate("pages >= 2", page1.pagination.pages >= 2);
  const session1 = page1.data[0];
  // Step 5: Fetch page 2 with limit=1
  const page2 = await api.functional.communityPlatform.member.sessions.index(
    memberConnection2,
    {
      body: {
        page: 2,
        limit: 1,
      } satisfies ICommunityPlatformMemberSession.IRequest,
    },
  );
  typia.assert(page2);
  // Step 6: Verify page 2 contains a different session than page 1
  TestValidator.equals("page 2 data length", page2.data.length, 1);
  const session2 = page2.data[0];
  TestValidator.notEquals("different session IDs", session1.id, session2.id);
  // Step 7: Verify both sessions reference the same member.id
  TestValidator.equals("same member ID", session1.member.id, session2.member.id);
  // Step 8: Verify sessions are sorted by created_at descending.
  // Session #2 (from login, more recent) appears before session #1 (from join, older).
  TestValidator.predicate(
    "sessions sorted by created_at descending",
    new Date(session1.created_at).getTime() >
      new Date(session2.created_at).getTime(),
  );
}
