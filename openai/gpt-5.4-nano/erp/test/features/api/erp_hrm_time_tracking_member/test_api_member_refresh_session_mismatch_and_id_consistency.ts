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

export async function test_api_member_refresh_session_mismatch_and_id_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: session mismatch to another member
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberAEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const memberBEmail = `${RandomGenerator.alphaNumeric(10)}@example.com`;
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail satisfies string & tags.Format<"email">,
      password: `P@ss-${RandomGenerator.alphaNumeric(12)}`,
      organizationName: RandomGenerator.name(3),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: `https://${RandomGenerator.alphabets(10)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(10)}.example.com/ref`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail satisfies string & tags.Format<"email">,
      password: `P@ss-${RandomGenerator.alphaNumeric(12)}`,
      organizationName: RandomGenerator.name(3),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 2,
      href: `https://${RandomGenerator.alphabets(10)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(10)}.example.com/ref`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberB);
  await TestValidator.httpError(
    "refresh should reject mismatched refreshToken for another member",
    [401, 403],
    async () => {
      await authorize_member_refresh(memberBConnection, {
        body: { refreshToken: memberA.token.refresh },
      });
    },
  );
  // Scenario 2: id consistency across refresh cycles
  const memberConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberConnection, {
    body: {
      email:
        `${RandomGenerator.alphaNumeric(10)}@example.com` satisfies string &
          tags.Format<"email">,
      password: `P@ss-${RandomGenerator.alphaNumeric(12)}`,
      organizationName: RandomGenerator.name(3),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: `https://${RandomGenerator.alphabets(10)}.example.com/join`,
      referrer: `https://${RandomGenerator.alphabets(10)}.example.com/ref`,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberC);
  const refresh1 = await authorize_member_refresh(memberConnection, {
    body: { refreshToken: memberC.token.refresh },
  });
  typia.assert(refresh1);
  TestValidator.equals("member id stable (refresh1)", refresh1.id, memberC.id);
  TestValidator.notEquals(
    "access token should rotate on refresh1",
    refresh1.token.access,
    memberC.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on refresh1",
    refresh1.token.refresh,
    memberC.token.refresh,
  );
  const refresh2 = await authorize_member_refresh(memberConnection, {
    body: { refreshToken: refresh1.token.refresh },
  });
  typia.assert(refresh2);
  TestValidator.equals("member id stable (refresh2)", refresh2.id, memberC.id);
  TestValidator.notEquals(
    "access token should rotate on refresh2",
    refresh2.token.access,
    refresh1.token.access,
  );
  TestValidator.notEquals(
    "refresh token should rotate on refresh2",
    refresh2.token.refresh,
    refresh1.token.refresh,
  );
}
