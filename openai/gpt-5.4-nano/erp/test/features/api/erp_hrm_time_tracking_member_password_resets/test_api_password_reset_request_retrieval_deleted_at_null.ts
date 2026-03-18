import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_request_retrieval_deleted_at_null(
  connection: api.IConnection,
): Promise<void> {
  // This endpoint requires an existing resetId seeded for Member A.
  // The test suite/environment is expected to provide a usable fixture resetId.
  // If no fixture exists, this test will fail (endpoint will likely return not-found).
  const memberAResetId: string & tags.Format<"uuid"> = (process.env
    .ERP_HRM_TIME_TRACKING_MEMBER_PASSWORD_RESET_ID ??
    "00000000-0000-0000-0000-000000000000") as string & tags.Format<"uuid">;
  // 1) Member A join
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/verify",
      referrer: "https://example.com/join",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberAAuthorized);
  // 2) Retrieve password reset record for Member A
  const resetRecord =
    await api.functional.erpHrmTimeTracking.member.password_resets.at(
      memberAConnection,
      {
        resetId: memberAResetId,
      },
    );
  typia.assert(resetRecord);
  TestValidator.equals("reset id matches", resetRecord.id, memberAResetId);
  TestValidator.equals("deleted_at is null", resetRecord.deleted_at, null);
  // Ensure no credential/token lookup material is leaked.
  TestValidator.predicate(
    "does not include token_identifier",
    Object.keys(resetRecord).every((k) => k !== "token_identifier"),
  );
  // 3) Member B join
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/verify",
      referrer: "https://example.com/join",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberBAuthorized);
  // 4) Cross-member access must not reveal reset record state.
  await TestValidator.error(
    "cross-member reset retrieval should not be allowed",
    async () => {
      await api.functional.erpHrmTimeTracking.member.password_resets.at(
        memberBConnection,
        {
          resetId: memberAResetId,
        },
      );
    },
  );
}
