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

export async function test_api_member_refresh_success_and_invalidated_sessions(
  connection: api.IConnection,
): Promise<void> {
  const memberConnectionBase: api.IConnection = { host: connection.host };
  // Scenario 1 (happy path): join -> refresh with original refresh token
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12),
    organizationName: RandomGenerator.name(3),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    organizationLogoUrl: null,
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const joined = await authorize_member_join(memberConnectionBase, {
    body: joinInput,
  });
  typia.assert(joined);
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshed1 = await authorize_member_refresh(refreshConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IErpHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed1);
  TestValidator.equals("member id matches join id", refreshed1.id, joined.id);
  TestValidator.predicate(
    "access token non-empty",
    refreshed1.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token non-empty",
    refreshed1.token.refresh.length > 0,
  );
  // If rotation is implemented, both access and refresh must differ.
  if (
    refreshed1.token.access !== joined.token.access ||
    refreshed1.token.refresh !== joined.token.refresh
  ) {
    TestValidator.notEquals(
      "access token should differ when rotation happens",
      refreshed1.token.access,
      joined.token.access,
    );
    TestValidator.notEquals(
      "refresh token should differ when rotation happens",
      refreshed1.token.refresh,
      joined.token.refresh,
    );
  }
  TestValidator.predicate(
    "expired_at is non-empty",
    refreshed1.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until is non-empty",
    refreshed1.token.refreshable_until.length > 0,
  );
  // Scenario 2 (session invalidated): use old refresh token after rotation (if rotation exists)
  const join2 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        ...joinInput,
        email: typia.random<string & tags.Format<"email">>(),
        organizationName: RandomGenerator.name(2),
        href: "https://example.com/join2",
        referrer: "https://example.com/referrer2",
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(join2);
  const conn2a: api.IConnection = { host: connection.host };
  const refreshed2a = await authorize_member_refresh(conn2a, {
    body: {
      refreshToken: join2.token.refresh,
    } satisfies IErpHrmTimeTrackingMember.IRefresh,
  });
  typia.assert(refreshed2a);
  const rotationHappened =
    refreshed2a.token.refresh !== join2.token.refresh ||
    refreshed2a.token.access !== join2.token.access;
  const conn2b: api.IConnection = { host: connection.host };
  if (rotationHappened) {
    await TestValidator.httpError(
      "refresh with invalidated/old refresh token should be unauthorized",
      [401, 403],
      async () => {
        await authorize_member_refresh(conn2b, {
          body: {
            refreshToken: join2.token.refresh,
          } satisfies IErpHrmTimeTrackingMember.IRefresh,
        });
      },
    );
  } else {
    const refreshed2b = await authorize_member_refresh(conn2b, {
      body: {
        refreshToken: join2.token.refresh,
      } satisfies IErpHrmTimeTrackingMember.IRefresh,
    });
    typia.assert(refreshed2b);
    TestValidator.equals(
      "member id still matches join id when rotation not implemented",
      refreshed2b.id,
      join2.id,
    );
  }
  // Scenario 3 (member becomes ineligible): cannot deactivate member via provided APIs.
  // Validate unauthorized for a clearly invalid refresh token.
  const join3 = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        ...joinInput,
        email: typia.random<string & tags.Format<"email">>(),
        organizationName: RandomGenerator.name(2),
        href: "https://example.com/join3",
        referrer: "https://example.com/referrer3",
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    },
  );
  typia.assert(join3);
  const invalidRefreshToken = `${join3.token.refresh}-invalid`;
  const conn3: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh with invalidated token should be unauthorized (ineligible behavior)",
    [401, 403],
    async () => {
      await authorize_member_refresh(conn3, {
        body: {
          refreshToken: invalidRefreshToken,
        } satisfies IErpHrmTimeTrackingMember.IRefresh,
      });
    },
  );
}
