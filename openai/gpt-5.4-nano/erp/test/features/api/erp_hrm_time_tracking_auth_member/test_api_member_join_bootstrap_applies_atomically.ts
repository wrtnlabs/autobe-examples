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

export async function test_api_member_join_bootstrap_applies_atomically(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const organizationCurrencyCode = RandomGenerator.pick([
    "USD",
    "KRW",
    "EUR",
    "JPY",
    "GBP",
  ] as const);
  const organizationTimezone = "Asia/Seoul";
  const organizationFiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const organizationLogoUrl: string | null = null;
  const joinBody = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl,
    organizationCurrencyCode,
    organizationTimezone,
    organizationFiscalStartMonth,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  // Execute join utility (must be used for this endpoint)
  const memberConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(firstJoin);
  // Validate auth-ready response consistency
  TestValidator.equals("member id returned", firstJoin.id !== "", true);
  TestValidator.equals(
    "access token returned",
    firstJoin.token.access !== "",
    true,
  );
  TestValidator.equals(
    "refresh token returned",
    firstJoin.token.refresh !== "",
    true,
  );
  // Re-join with same email should fail and must not create another member/org
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate join email should fail", async () => {
    await authorize_member_join(secondMemberConnection, { body: joinBody });
  });
}
