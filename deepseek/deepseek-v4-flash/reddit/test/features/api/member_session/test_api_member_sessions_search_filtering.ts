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

export async function test_api_member_sessions_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join a new member with specific session metadata values
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: "password123",
      href: "https://reddit.com/r/join",
      referrer: "https://google.com/search?q=reddit",
      ip: "10.0.0.42",
    },
  });
  // 2. Search by IP address substring
  const ipSearchResult =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          search: "10.0.0",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(ipSearchResult);
  TestValidator.predicate(
    "ip search returns at least one session",
    ipSearchResult.data.length >= 1,
  );
  // 3. Search by href URL substring
  const hrefSearchResult =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          search: "reddit.com/r",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(hrefSearchResult);
  TestValidator.predicate(
    "href search returns at least one session",
    hrefSearchResult.data.length >= 1,
  );
  // 4. Search by nonsense string that cannot match any session metadata
  const nonsenseSearchResult =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: {
          search: "zzzzz_nonexistent_session_99999",
        } satisfies ICommunityPlatformMemberSession.IRequest,
      },
    );
  typia.assert(nonsenseSearchResult);
  // 5. Verify nonsense search returns an empty page
  TestValidator.equals(
    "nonsense search returns empty data",
    nonsenseSearchResult.data,
    [],
  );
  TestValidator.equals(
    "nonsense search records is 0",
    nonsenseSearchResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "nonsense search pages is 0",
    nonsenseSearchResult.pagination.pages,
    0,
  );
  // 6. Verify pagination structure is still valid
  TestValidator.predicate(
    "pagination current >= 1",
    nonsenseSearchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    nonsenseSearchResult.pagination.limit > 0,
  );
}
