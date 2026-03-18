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

export async function test_api_member_password_resets_expired_token_does_not_update_password(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member signup (original password)
  const originalPassword = typia.random<string & tags.Format<"password">>();
  const email = typia.random<string & tags.Format<"email">>();
  const memberJoinBody = {
    email,
    password: originalPassword,
    organizationName: RandomGenerator.name(2),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: "127.0.0.1",
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const memberJoinConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberJoinConnection, {
    body: memberJoinBody,
  });
  // 2) Create an expired reset token identifier.
  // Note: no reset-token seeding API is available in the provided materials.
  // We still proceed with a deterministic tokenIdentifier to verify that
  // calling the endpoint does not update password when reset is rejected.
  const expiredTokenIdentifier =
    "expired-token-" + RandomGenerator.alphaNumeric(16);
  const newPassword = typia.random<string & tags.Format<"password">>();
  // 3) Attempt password reset with expired token
  const resetAttemptConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "expired reset token must not update password",
    async () => {
      const body = {
        tokenIdentifier: expiredTokenIdentifier,
        newPassword,
        page: null,
        limit: null,
      } satisfies IErpHrmTimeTrackingMemberPasswordReset.IRequest;
      await api.functional.erpHrmTimeTracking.member.password_resets.updatePasswordWithResetToken(
        resetAttemptConnection,
        {
          body,
        },
      );
    },
  );
  // 5) Verify password unchanged:
  // - login with original password should succeed
  const verifyOriginalLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(verifyOriginalLoginConnection, {
    body: {
      email,
      password: originalPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  // - login with newPassword should fail
  const verifyNewPasswordLoginConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error(
    "login with newPassword must fail because password not updated",
    async () => {
      await authorize_member_login(verifyNewPasswordLoginConnection, {
        body: {
          email,
          password: newPassword,
        } satisfies IErpHrmTimeTrackingMember.ILogin,
      });
    },
  );
}
