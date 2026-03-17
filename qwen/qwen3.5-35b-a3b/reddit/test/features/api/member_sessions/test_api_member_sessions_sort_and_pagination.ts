import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityDateTimeRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityDateTimeRange";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_sort_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authResponse);
  // Create member-specific connection with token
  const memberSessionConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authResponse.token.access },
  };
  // 2. Test expired_at, asc sorting with pagination
  const expiredAtAscResponse =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "expired_at",
          direction: "asc",
          page: 1,
          limit: 10,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(expiredAtAscResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    expiredAtAscResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    expiredAtAscResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    expiredAtAscResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    expiredAtAscResponse.pagination.pages >= 0,
  );
  // Verify sorting by expired_at (ascending)
  if (expiredAtAscResponse.data.length > 1) {
    for (let i = 0; i < expiredAtAscResponse.data.length - 1; i++) {
      const current = expiredAtAscResponse.data[i].expired_at;
      const next = expiredAtAscResponse.data[i + 1].expired_at;
      TestValidator.predicate(
        `sorted by expired_at asc: index ${i}`,
        current <= next,
      );
    }
  }
  // 3. Test created_at, desc sorting
  const createdAtDescResponse =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "created_at",
          direction: "desc",
          page: 1,
          limit: 10,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(createdAtDescResponse);
  if (createdAtDescResponse.data.length > 1) {
    for (let i = 0; i < createdAtDescResponse.data.length - 1; i++) {
      const current = createdAtDescResponse.data[i].created_at;
      const next = createdAtDescResponse.data[i + 1].created_at;
      TestValidator.predicate(
        `sorted by created_at desc: index ${i}`,
        current >= next,
      );
    }
  }
  // 4. Test created_at, asc sorting
  const createdAtAscResponse =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "created_at",
          direction: "asc",
          page: 1,
          limit: 10,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(createdAtAscResponse);
  if (createdAtAscResponse.data.length > 1) {
    for (let i = 0; i < createdAtAscResponse.data.length - 1; i++) {
      const current = createdAtAscResponse.data[i].created_at;
      const next = createdAtAscResponse.data[i + 1].created_at;
      TestValidator.predicate(
        `sorted by created_at asc: index ${i}`,
        current <= next,
      );
    }
  }
  // 5. Test ip sorting (asc)
  const ipAscResponse =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "ip",
          direction: "asc",
          page: 1,
          limit: 10,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(ipAscResponse);
  if (ipAscResponse.data.length > 1) {
    for (let i = 0; i < ipAscResponse.data.length - 1; i++) {
      const current = ipAscResponse.data[i].ip;
      const next = ipAscResponse.data[i + 1].ip;
      TestValidator.predicate(`sorted by ip asc: index ${i}`, current <= next);
    }
  }
  // 6. Test ip sorting (desc)
  const ipDescResponse =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "ip",
          direction: "desc",
          page: 1,
          limit: 10,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(ipDescResponse);
  if (ipDescResponse.data.length > 1) {
    for (let i = 0; i < ipDescResponse.data.length - 1; i++) {
      const current = ipDescResponse.data[i].ip;
      const next = ipDescResponse.data[i + 1].ip;
      TestValidator.predicate(`sorted by ip desc: index ${i}`, current >= next);
    }
  }
  // 7. Test pagination consistency across pages
  const page1Response =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "created_at",
          direction: "desc",
          page: 1,
          limit: 5,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(page1Response);
  const page2Response =
    await api.functional.redditCommunity.member.sessions.index(
      memberSessionConnection,
      {
        body: {
          sort: "created_at",
          direction: "desc",
          page: 2,
          limit: 5,
          deleted_at: false,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals(
    "pagination pages calculation",
    page1Response.pagination.pages,
    Math.ceil(
      page1Response.pagination.records / page1Response.pagination.limit,
    ),
  );
  // Ensure page 2 is different from page 1 (if enough records)
  if (page1Response.pagination.pages > 1) {
    TestValidator.notEquals(
      "page 1 and page 2 have different records",
      page1Response.data[0]?.id,
      page2Response.data[0]?.id,
    );
  }
}
