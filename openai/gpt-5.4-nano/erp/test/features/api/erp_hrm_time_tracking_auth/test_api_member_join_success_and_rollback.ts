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

export async function test_api_member_join_success_and_rollback(
  connection: api.IConnection,
): Promise<void> {
  const href = typia.random<string & import("typia").tags.Format<"uri">>();
  const referrer = typia.random<string & import("typia").tags.Format<"uri">>();
  const organizationCommon = {
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 4 satisfies number &
      import("typia").tags.Type<"int32"> &
      import("typia").tags.Minimum<1> &
      import("typia").tags.Maximum<12>,
    href,
    referrer,
    ip: null,
  } satisfies Omit<IErpHrmTimeTrackingMember.IJoin, "email" | "password">;
  const memberEmail1 = typia.random<
    string & import("typia").tags.Format<"email">
  >();
  const password1 = RandomGenerator.alphabets(12);
  const memberConnection1: api.IConnection = { host: connection.host };
  const auth1 = await authorize_member_join(memberConnection1, {
    body: {
      email: memberEmail1,
      password: password1,
      ...organizationCommon,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(auth1);
  const memberEmail2 = typia.random<
    string & import("typia").tags.Format<"email">
  >();
  const password2 = RandomGenerator.alphabets(12);
  const memberConnection2: api.IConnection = { host: connection.host };
  const auth2 = await authorize_member_join(memberConnection2, {
    body: {
      email: memberEmail2,
      password: password2,
      ...organizationCommon,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(auth2);
  TestValidator.notEquals(
    "member ids differ across independent accounts",
    auth1.id,
    auth2.id,
  );
  // Duplicate account / rollback
  const memberConnectionDup: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email join is rejected", async () => {
    await authorize_member_join(memberConnectionDup, {
      body: {
        email: memberEmail1,
        password: RandomGenerator.alphabets(12),
        ...organizationCommon,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  });
  // Original email remains registered (re-attempt should also be rejected)
  const memberConnectionDup2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "original email remains registered after rollback",
    async () => {
      await authorize_member_join(memberConnectionDup2, {
        body: {
          email: memberEmail1,
          password: RandomGenerator.alphabets(12),
          ...organizationCommon,
        } satisfies IErpHrmTimeTrackingMember.IJoin,
      });
    },
  );
  // Ensure system can still create additional members
  const memberEmail3 = typia.random<
    string & import("typia").tags.Format<"email">
  >();
  const password3 = RandomGenerator.alphabets(12);
  const memberConnection3: api.IConnection = { host: connection.host };
  const auth3 = await authorize_member_join(memberConnection3, {
    body: {
      email: memberEmail3,
      password: password3,
      ...organizationCommon,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(auth3);
}
