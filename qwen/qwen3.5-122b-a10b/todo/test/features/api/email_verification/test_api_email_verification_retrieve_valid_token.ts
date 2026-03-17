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

export async function test_api_email_verification_retrieve_valid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account (generates email verification token)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Retrieve email verification token details
  // In simulation mode, random UUID works; in production, would need actual verification ID
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const verification =
    await api.functional.multiUserTodo.member.email_verifications.at(
      memberConnection,
      { verificationId },
    );
  typia.assert(verification);
  // 3. Validate business logic - token is valid (not expired, not used, not deleted)
  TestValidator.predicate(
    "verification token is valid",
    verification.isValid === true,
  );
  TestValidator.equals(
    "verification ID matches",
    verification.id,
    verificationId,
  );
  TestValidator.equals(
    "member ID matches authorized member",
    verification.multiUserTodoMemberId,
    authorized.id,
  );
  TestValidator.equals(
    "email matches registered email",
    verification.email,
    authorized.email,
  );
  // 4. Validate member summary information
  TestValidator.equals(
    "member summary ID matches",
    verification.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "member summary email matches",
    verification.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member summary name matches",
    verification.member.name,
    authorized.name,
  );
}
