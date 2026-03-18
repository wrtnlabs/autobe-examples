import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_token_reuse(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const initialPassword = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: initialPassword,
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(joined);
  const resetToken = typia.random<string & tags.Format<"uuid">>();
  const firstNewPassword = RandomGenerator.alphaNumeric(16);
  const secondNewPassword = RandomGenerator.alphaNumeric(16);
  await TestValidator.httpError(
    "password reset with an unavailable token should be rejected",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.password_resets.update(
        { host: connection.host },
        {
          body: {
            token: resetToken,
            password: firstNewPassword,
          } satisfies IHrmTimeTrackingMember.IResetPassword,
        },
      );
    },
  );
  await TestValidator.httpError(
    "password reset token cannot be reused after consumption",
    [400, 401, 403, 404, 409],
    async () => {
      await api.functional.hrmTimeTracking.member.password_resets.update(
        { host: connection.host },
        {
          body: {
            token: resetToken,
            password: secondNewPassword,
          } satisfies IHrmTimeTrackingMember.IResetPassword,
        },
      );
    },
  );
  const relogged = await authorize_member_login(
    { host: connection.host },
    {
      body: {
        email: joined.email,
        password: initialPassword,
      },
    },
  );
  typia.assert(relogged);
  TestValidator.equals("member email preserved", relogged.email, joined.email);
  TestValidator.equals("member id preserved", relogged.id, joined.id);
}
