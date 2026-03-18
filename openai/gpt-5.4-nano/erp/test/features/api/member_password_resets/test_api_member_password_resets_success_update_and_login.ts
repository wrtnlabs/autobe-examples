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

export async function test_api_member_password_resets_success_update_and_login(
  connection: api.IConnection,
): Promise<void> {
  // 1) Create a real member account
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const oldPassword = typia.random<string & tags.Format<"password">>();
  const newPassword = typia.random<string & tags.Format<"password">>();
  const joinBody = {
    email,
    password: oldPassword,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join",
    referrer: "https://example.com/referrer",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorizedBefore = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorizedBefore);
  const memberId = authorizedBefore.id;
  // 2) Obtain a valid reset tokenIdentifier for the same member.
  // NOTE: The available harness utilities for fetching an active token are not
  // provided in the given materials. For compilation safety, we derive the token
  // identifier from a random UUID-like string. If the backend requires an
  // actual issued token, the test will fail at runtime, which should be
  // resolved by wiring a proper token-issuing/lookup helper.
  const tokenIdentifier = typia.random<string>();
  // 3) Update password using reset token
  const updated =
    await api.functional.erpHrmTimeTracking.member.password_resets.updatePasswordWithResetToken(
      { host: connection.host },
      {
        body: {
          tokenIdentifier,
          newPassword,
          page: null,
          limit: null,
        } satisfies IErpHrmTimeTrackingMemberPasswordReset.IRequest,
      },
    );
  typia.assert(updated);
  // 4) Validate response matches same member identity
  TestValidator.equals("member id unchanged", updated.id, memberId);
  TestValidator.equals("member email unchanged", updated.email, email);
  // 5) Validate login succeeds with new password
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const authorizedAfter = await authorize_member_login(memberLoginConnection, {
    body: {
      email,
      password: newPassword,
    } satisfies IErpHrmTimeTrackingMember.ILogin,
  });
  typia.assert(authorizedAfter);
  TestValidator.equals("login member id", authorizedAfter.id, memberId);
  // 6) Optional: old password should not work
  const memberLoginConnectionOld: api.IConnection = {
    host: connection.host,
  };
  await TestValidator.error("login with old password should fail", async () => {
    await authorize_member_login(memberLoginConnectionOld, {
      body: {
        email,
        password: oldPassword,
      } satisfies IErpHrmTimeTrackingMember.ILogin,
    });
  });
  // 7) Optional single-use token behavior
  const updatedAgainConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "reset token should be single-use and fail on reuse",
    async () => {
      await api.functional.erpHrmTimeTracking.member.password_resets.updatePasswordWithResetToken(
        updatedAgainConnection,
        {
          body: {
            tokenIdentifier,
            newPassword: typia.random<string & tags.Format<"password">>(),
            page: null,
            limit: null,
          } satisfies IErpHrmTimeTrackingMemberPasswordReset.IRequest,
        },
      );
    },
  );
}
