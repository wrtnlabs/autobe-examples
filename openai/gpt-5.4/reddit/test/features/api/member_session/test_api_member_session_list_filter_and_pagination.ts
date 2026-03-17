import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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

export async function test_api_member_session_list_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: `https://example.com/${RandomGenerator.alphabets(8)}`,
    referrer: `https://referrer.example.com/${RandomGenerator.alphabets(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  const baselineRequest = {
    sort: "-created_at",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMemberSession.IRequest;
  const baseline = await api.functional.communityPlatform.member.sessions.index(
    memberConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baseline);
  TestValidator.equals(
    "baseline pagination current page",
    baseline.pagination.current,
    1,
  );
  TestValidator.equals(
    "baseline pagination limit",
    baseline.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "baseline data length within limit",
    baseline.data.length <= 10,
  );
  TestValidator.predicate(
    "baseline record count covers returned rows",
    baseline.pagination.records >= baseline.data.length,
  );
  TestValidator.predicate(
    "baseline pages non-negative",
    baseline.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline includes at least one session",
    baseline.data.length >= 1,
  );
  TestValidator.predicate(
    "baseline contains joined session href",
    ArrayUtil.has(baseline.data, (session) => session.href === joinInput.href),
  );
  TestValidator.predicate(
    "baseline contains joined session referrer",
    ArrayUtil.has(
      baseline.data,
      (session) => session.referrer === joinInput.referrer,
    ),
  );
  TestValidator.predicate(
    "baseline contains joined session ip",
    ArrayUtil.has(baseline.data, (session) => session.ip === joinInput.ip),
  );
  for (let i = 1; i < baseline.data.length; ++i) {
    const previous = baseline.data[i - 1];
    const current = baseline.data[i];
    const previousCreatedAt = new Date(previous.created_at).getTime();
    const currentCreatedAt = new Date(current.created_at).getTime();
    TestValidator.predicate(
      `baseline sort order created_at desc ${i}`,
      previousCreatedAt >= currentCreatedAt,
    );
  }
  const seedSession = baseline.data.find(
    (session) =>
      session.href === joinInput.href &&
      session.referrer === joinInput.referrer &&
      session.ip === joinInput.ip,
  );
  if (seedSession === undefined) {
    throw new Error("Failed to find the joined member session in baseline results.");
  }
  const seedCreatedAt = seedSession.created_at;
  const seedIsActive = new Date(seedSession.expired_at).getTime() > Date.now();
  const activeRequest = {
    is_active: seedIsActive,
    created_from: seedCreatedAt,
    created_to: seedCreatedAt,
    sort: "created_at",
    page: 1,
    limit: 1,
  } satisfies ICommunityPlatformMemberSession.IRequest;
  const activeFiltered =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: activeRequest,
      },
    );
  typia.assert(activeFiltered);
  TestValidator.equals(
    "filtered pagination current page",
    activeFiltered.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered pagination limit",
    activeFiltered.pagination.limit,
    1,
  );
  TestValidator.predicate(
    "filtered data length within limit",
    activeFiltered.data.length <= 1,
  );
  TestValidator.predicate(
    "filtered includes seed session",
    ArrayUtil.has(
      activeFiltered.data,
      (session) => session.id === seedSession.id,
    ),
  );
  for (const session of activeFiltered.data) {
    TestValidator.predicate(
      `filtered lower bound includes ${session.id}`,
      new Date(session.created_at).getTime() >=
        new Date(seedCreatedAt).getTime(),
    );
    TestValidator.predicate(
      `filtered upper bound includes ${session.id}`,
      new Date(session.created_at).getTime() <=
        new Date(seedCreatedAt).getTime(),
    );
    TestValidator.equals(
      `filtered active status matches ${session.id}`,
      new Date(session.expired_at).getTime() > Date.now(),
      seedIsActive,
    );
  }
  const repeatedFiltered =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: activeRequest,
      },
    );
  typia.assert(repeatedFiltered);
  TestValidator.equals(
    "repeated filtered current page stable",
    repeatedFiltered.pagination.current,
    activeFiltered.pagination.current,
  );
  TestValidator.equals(
    "repeated filtered limit stable",
    repeatedFiltered.pagination.limit,
    activeFiltered.pagination.limit,
  );
  TestValidator.equals(
    "repeated filtered record count stable",
    repeatedFiltered.pagination.records,
    activeFiltered.pagination.records,
  );
  TestValidator.equals(
    "repeated filtered page count stable",
    repeatedFiltered.pagination.pages,
    activeFiltered.pagination.pages,
  );
  TestValidator.equals(
    "repeated filtered ids stable",
    repeatedFiltered.data.map((session) => session.id),
    activeFiltered.data.map((session) => session.id),
  );
  const expiredSortRequest = {
    created_from: seedCreatedAt,
    sort: "expired_at",
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformMemberSession.IRequest;
  const expiredSorted =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: expiredSortRequest,
      },
    );
  typia.assert(expiredSorted);
  for (let i = 1; i < expiredSorted.data.length; ++i) {
    const previous = expiredSorted.data[i - 1];
    const current = expiredSorted.data[i];
    const previousExpiredAt = new Date(previous.expired_at).getTime();
    const currentExpiredAt = new Date(current.expired_at).getTime();
    TestValidator.predicate(
      `expired_at ascending order ${i}`,
      previousExpiredAt <= currentExpiredAt,
    );
  }
  const repeatedBaseline =
    await api.functional.communityPlatform.member.sessions.index(
      memberConnection,
      {
        body: baselineRequest,
      },
    );
  typia.assert(repeatedBaseline);
  TestValidator.equals(
    "read-only baseline current page stable",
    repeatedBaseline.pagination.current,
    baseline.pagination.current,
  );
  TestValidator.equals(
    "read-only baseline limit stable",
    repeatedBaseline.pagination.limit,
    baseline.pagination.limit,
  );
  TestValidator.equals(
    "read-only baseline ids stable",
    repeatedBaseline.data.map((session) => session.id),
    baseline.data.map((session) => session.id),
  );
  TestValidator.equals(
    "read-only baseline record count stable",
    repeatedBaseline.pagination.records,
    baseline.pagination.records,
  );
}
