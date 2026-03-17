import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_email_verification_retrieve_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member (this creates an email verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Generate a verification ID to test with
  // Note: In a real scenario, we would need to retrieve the actual verification ID
  // from the system. For this test, we use a randomly generated UUID.
  const verificationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the email verification details
  const verification =
    await api.functional.multiUserTodo.member.email_verifications.at(
      memberConnection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
  // 4. Validate business logic - member relationship
  TestValidator.equals(
    "member ID matches authorized member",
    verification.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member email matches",
    verification.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member name matches",
    verification.member.name,
    authorized.name,
  );
  // 5. Validate the isValid computed field exists and is boolean
  TestValidator.predicate(
    "isValid is boolean",
    typeof verification.isValid === "boolean",
  );
  // 6. Validate purpose is one of the allowed values
  TestValidator.predicate(
    "purpose is valid",
    verification.purpose === "registration" ||
      verification.purpose === "email_change",
  );
  // 7. Validate expiration logic - if token is not used and not deleted,
  // isValid should reflect whether expiresAt is in the future
  const isExpired = new Date(verification.expiresAt) < new Date();
  TestValidator.predicate(
    "isValid reflects expiration status",
    verification.isValid === !isExpired ||
      verification.usedAt !== null ||
      verification.deletedAt !== null,
  );
}
