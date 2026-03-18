import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_refresh_window_and_concurrency(
  connection: api.IConnection,
): Promise<void> {
  const sleep = async (ms: number): Promise<void> => {
    if (ms <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, ms));
  };
  const baseJoinBody: Omit<
    IErpHrmTimeTrackingMember.IJoin,
    "email" | "password"
  > = {
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies Omit<IErpHrmTimeTrackingMember.IJoin, "email" | "password">;
  // Scenario 1: refresh within window boundary
  const memberConnection1: api.IConnection = { host: connection.host };
  const joined1 = await authorize_member_join(memberConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      ...baseJoinBody,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined1);
  const refreshableUntil1 = new Date(joined1.token.refreshable_until).getTime();
  const target1 = refreshableUntil1 - 5000; // 5s before boundary
  const now1 = Date.now();
  await sleep(target1 - now1);
  const memberConnection1Refresh: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_member_refresh(memberConnection1Refresh, {
    body: {
      refreshToken: joined1.token.refresh,
    } satisfies IErpHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed1);
  TestValidator.equals("same member id", refreshed1.id, joined1.id);
  TestValidator.predicate(
    "access expiration advanced",
    new Date(refreshed1.token.expired_at).getTime() >
      new Date(joined1.token.expired_at).getTime(),
  );
  // Scenario 2: refresh after window expiration
  const memberConnection2: api.IConnection = { host: connection.host };
  const joined2 = await authorize_member_join(memberConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      ...baseJoinBody,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined2);
  const refreshableUntil2 = new Date(joined2.token.refreshable_until).getTime();
  const target2 = refreshableUntil2 + 5000; // 5s after boundary
  const now2 = Date.now();
  await sleep(target2 - now2);
  await TestValidator.error(
    "refresh should be rejected after refreshable_until",
    async () => {
      const memberConnection2Refresh: api.IConnection = {
        host: connection.host,
      };
      await authorize_member_refresh(memberConnection2Refresh, {
        body: {
          refreshToken: joined2.token.refresh,
        } satisfies IErpHrmTimeTrackingMember.IRefresh,
      });
    },
  );
  // Scenario 3: concurrent refresh consistency / rotation
  const memberConnection3: api.IConnection = { host: connection.host };
  const joined3 = await authorize_member_join(memberConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      ...baseJoinBody,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined3);
  const memberConnection3a: api.IConnection = { host: connection.host };
  const memberConnection3b: api.IConnection = { host: connection.host };
  const results = await Promise.allSettled([
    authorize_member_refresh(memberConnection3a, {
      body: {
        refreshToken: joined3.token.refresh,
      } satisfies IErpHrmTimeTrackingMember.IRefresh,
    }),
    authorize_member_refresh(memberConnection3b, {
      body: {
        refreshToken: joined3.token.refresh,
      } satisfies IErpHrmTimeTrackingMember.IRefresh,
    }),
  ]);
  const successes = results.filter(
    (r): r is PromiseFulfilledResult<IErpHrmTimeTrackingMember.IAuthorized> =>
      r.status === "fulfilled",
  );
  const failures = results.filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  TestValidator.predicate(
    "concurrency outcome is valid",
    successes.length === 2 || successes.length === 1,
  );
  TestValidator.predicate(
    "rejections are at most one",
    failures.length === 0 || failures.length === 1,
  );
  if (successes.length >= 1) {
    const winner = successes[0].value;
    typia.assert(winner);
    TestValidator.equals("member id stable on success", winner.id, joined3.id);
    TestValidator.predicate(
      "successful refresh advances access expiration",
      new Date(winner.token.expired_at).getTime() >
        new Date(joined3.token.expired_at).getTime(),
    );
  }
}
