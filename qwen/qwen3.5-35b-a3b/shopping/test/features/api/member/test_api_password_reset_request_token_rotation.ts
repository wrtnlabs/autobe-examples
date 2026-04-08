import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetRequest";
import type { IEcommerceMallMemberPasswordResetResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordResetResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_request_token_rotation(
  connection: api.IConnection,
): Promise<void> {
  // Create customer account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const account = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(account);
  // Verify customer email format is valid
  TestValidator.predicate(
    "customer email is valid",
    account.email.includes("@"),
  );
  // Submit first password reset request
  const passwordResetConnection1: api.IConnection = { host: connection.host };
  const firstRequest =
    await api.functional.ecommerceMall.member.password_resets.request(
      passwordResetConnection1,
      {
        body: { email: account.email },
      },
    );
  typia.assert(firstRequest);
  // Verify first request returned success
  TestValidator.equals(
    "first password reset request succeeded",
    firstRequest.message.includes("reset"),
    true,
  );
  // Capture first request timestamp
  const firstRequestedAt = firstRequest.reset_requested_at;
  TestValidator.predicate(
    "first request has timestamp",
    firstRequestedAt !== undefined,
  );
  // Immediately submit second password reset request with same email
  const passwordResetConnection2: api.IConnection = { host: connection.host };
  const secondRequest =
    await api.functional.ecommerceMall.member.password_resets.request(
      passwordResetConnection2,
      {
        body: { email: account.email },
      },
    );
  typia.assert(secondRequest);
  // Verify second request also returned success
  TestValidator.equals(
    "second password reset request succeeded",
    secondRequest.message.includes("reset"),
    true,
  );
  // Capture second request timestamp
  const secondRequestedAt = secondRequest.reset_requested_at;
  TestValidator.predicate(
    "second request has timestamp",
    secondRequestedAt !== undefined,
  );
  // Verify timestamps are different (token was rotated)
  TestValidator.notEquals(
    "password reset token was rotated (different timestamps)",
    firstRequestedAt,
    secondRequestedAt,
  );
  // Verify second timestamp is after first timestamp
  TestValidator.predicate(
    "second token created after first token",
    secondRequestedAt !== undefined &&
      firstRequestedAt !== undefined &&
      new Date(secondRequestedAt).getTime() >
        new Date(firstRequestedAt).getTime(),
  );
  // Verify both requests have similar message format (success confirmation)
  TestValidator.equals(
    "both requests return success messages",
    firstRequest.message.length > 0,
    true,
  );
  TestValidator.equals(
    "second request returns success message",
    secondRequest.message.length > 0,
    true,
  );
}
