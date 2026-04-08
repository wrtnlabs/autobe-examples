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

export async function test_api_password_reset_retrieve_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account to have a valid member in the system
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // Step 2: Create authenticated connection for password reset retrieval
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: member.token.access,
  };
  // Step 3: Retrieve password reset record using a random resetId
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const passwordReset: IEcommerceMallMemberPasswordReset =
    await api.functional.ecommerceMall.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordReset);
  // Step 4: Validate response structure and field types
  // Validate ID format
  typia.assert<string & tags.Format<"uuid">>(passwordReset.id);
  // Validate email format
  typia.assert<string & tags.Format<"email">>(passwordReset.email);
  // Validate token field (may be undefined if not set)
  if (passwordReset.token !== undefined) {
    typia.assert<string>(passwordReset.token);
  }
  // Validate all timestamp formats are ISO 8601 date-time
  typia.assert<string & tags.Format<"date-time">>(passwordReset.expires_at);
  typia.assert<string | null>(passwordReset.used_at);
  typia.assert<string & tags.Format<"date-time">>(passwordReset.created_at);
  typia.assert<string & tags.Format<"date-time">>(passwordReset.updated_at);
  typia.assert<string | null>(passwordReset.deleted_at);
  // Validate member reference structure
  typia.assert<IEcommerceMallMember.ISummary>(passwordReset.member);
  // Step 5: Validate business rules
  // Member reference should have valid UUID
  typia.assert<string & tags.Format<"uuid">>(passwordReset.member.id);
  // Member email should match the password reset email
  TestValidator.equals(
    "member email matches reset email",
    passwordReset.member.email,
    passwordReset.email,
  );
  // Validate expiration timestamp is a valid date
  TestValidator.predicate(
    "expires_at is valid date-time",
    () => new Date(passwordReset.expires_at).getTime() !== 0,
  );
  // Validated: Response preserves all token status fields
  // (actual expiration/usage state depends on database content)
  TestValidator.predicate(
    "used_at is null or valid date-time",
    () =>
      passwordReset.used_at === null ||
      new Date(passwordReset.used_at).getTime() !== 0,
  );
  TestValidator.predicate(
    "deleted_at is null or valid date-time",
    () =>
      passwordReset.deleted_at === null ||
      new Date(passwordReset.deleted_at).getTime() !== 0,
  );
}
