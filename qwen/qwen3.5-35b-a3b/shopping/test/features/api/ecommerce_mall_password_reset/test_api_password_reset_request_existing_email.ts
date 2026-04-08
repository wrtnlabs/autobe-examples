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

export async function test_api_password_reset_request_existing_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a customer account using utility function
  const registerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallMember.IAuthorized =
    await api.functional.ecommerceMall.auth.member.join(registerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customer);
  // 2. Request password reset
  const resetConnection: api.IConnection = { host: connection.host };
  const response: IEcommerceMallMemberPasswordResetResponse =
    await api.functional.ecommerceMall.member.password_resets.request(
      resetConnection,
      {
        body: {
          email: customer.email,
        } satisfies IEcommerceMallMemberPasswordResetRequest,
      },
    );
  typia.assert(response);
  // 3. Validate response message
  TestValidator.equals("message is present", response.message, undefined);
  TestValidator.equals(
    "message is non-empty string",
    response.message.length > 0,
    true,
  );
  // 4. Validate reset_requested_at timestamp
  TestValidator.equals(
    "reset_requested_at is present",
    response.reset_requested_at,
    undefined,
  );
  TestValidator.predicate("reset_requested_at is valid date-time format", () =>
    /^d{4}-d{2}-d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
      response.reset_requested_at!,
    ),
  );
  // 5. Verify no token is exposed in response
  TestValidator.equals(
    "response does not contain token field",
    "token" in response,
    false,
  );
}
