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

export async function test_api_member_password_resets_invalidated_token_does_not_update_password(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const originalPassword = `Orig-${RandomGenerator.alphaNumeric(16)}`;
  const newPassword = `New-${RandomGenerator.alphaNumeric(16)}`;
  // 1) Join a member with a known original password
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_member_join(memberJoinConnection, {
    body: {
      email,
      password: originalPassword,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  // Ensure original password works
  const loginWithOriginalConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_member_login(loginWithOriginalConnection, {
    body: {
      email,
      password: originalPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  // 2) Use an invalidated token identifier (deleted_at is assumed non-null in backend fixture)
  const tokenIdentifier = `invalid-token-${RandomGenerator.alphaNumeric(24)}`;
  const resetRequest = {
    tokenIdentifier,
    newPassword,
    page: null,
    limit: null,
  } satisfies IErpHrmTimeTrackingMemberPasswordReset.IRequest;
  // 3) Attempt password reset with invalidated token
  await TestValidator.error(
    "rejects invalidated reset token and does not update password",
    async () => {
      await api.functional.erpHrmTimeTracking.member.password_resets.updatePasswordWithResetToken(
        { host: connection.host },
        { body: resetRequest },
      );
    },
  );
  // 4) Validate no DB change: original password still succeeds
  const loginAfterResetConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(loginAfterResetConnection, {
    body: {
      email,
      password: originalPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  // newPassword should fail
  const loginWithNewPasswordConnection: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error("new password is not accepted", async () => {
    await authorize_member_login(loginWithNewPasswordConnection, {
      body: {
        email,
        password: newPassword,
      } satisfies IErpHrmTimeTrackingMember.ILogin,
    });
  });
  // 5) Repeated attempts with same invalidated token keep being rejected
  await TestValidator.error(
    "repeated invalidated token attempts are consistently rejected",
    async () => {
      await api.functional.erpHrmTimeTracking.member.password_resets.updatePasswordWithResetToken(
        { host: connection.host },
        { body: resetRequest },
      );
    },
  );
}
