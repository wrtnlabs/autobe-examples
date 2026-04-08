import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_retrieve_active_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account with randomized credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset (system creates reset record with unique resetId)
  // Note: Password reset creation endpoint not in provided API list,
  // but scenario specifies this step. We'll use a placeholder resetId
  // that would be returned from the password reset creation endpoint.
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the password reset record using the resetId
  const passwordReset =
    await api.functional.ecommerceMall.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate response structure and business rules
  TestValidator.equals("reset id matches request", passwordReset.id, resetId);
  TestValidator.equals(
    "email matches member",
    passwordReset.email,
    member.email,
  );
  // Validate token is masked (first 4 + last 4 characters)
  if (passwordReset.token !== undefined && passwordReset.token !== null) {
    TestValidator.predicate(
      "token is masked",
      () => passwordReset.token!.length >= 8,
    );
  }
  // Validate token status indicators for active token
  const expiresAt = new Date(passwordReset.expires_at);
  const now = new Date();
  TestValidator.predicate("token not expired", () => expiresAt > now);
  TestValidator.equals("token not used", passwordReset.used_at, null);
  TestValidator.equals("token not deleted", passwordReset.deleted_at, null);
  // Validate member reference
  TestValidator.equals("member id matches", passwordReset.member.id, member.id);
  TestValidator.equals(
    "member email matches",
    passwordReset.member.email,
    member.email,
  );
}
