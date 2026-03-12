import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_retrieve_own_token(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated member can retrieve their own password reset token record.
   * 1. Register a new member account
   * 2. Create a password reset token (simulated via random UUID)
   * 3. Retrieve the password reset token using the resetId
   * 4. Validate response contains token details, owner information, and audit data
   */
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a resetId (in real scenario, this would come from a password reset request)
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the password reset token
  const passwordReset =
    await api.functional.discussionBoard.member.password_resets.at(
      memberConnection,
      { resetId },
    );
  typia.assert(passwordReset);
  // 4. Validate token structure and business logic
  TestValidator.equals("token id matches request", passwordReset.id, resetId);
  TestValidator.predicate("token has value", passwordReset.token.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    passwordReset.created_at.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    passwordReset.expired_at.length > 0,
  );
  TestValidator.equals(
    "unused token has null used_at",
    passwordReset.used_at,
    null,
  );
  TestValidator.equals(
    "member token has null token_type",
    passwordReset.token_type,
    null,
  );
  TestValidator.equals(
    "member token has null updated_at",
    passwordReset.updated_at,
    null,
  );
  // Validate owner information
  TestValidator.predicate(
    "owner has email",
    passwordReset.owner.email.length > 0,
  );
  TestValidator.equals(
    "owner is the requesting member",
    passwordReset.owner.email,
    memberEmail,
  );
  TestValidator.equals(
    "owner display_name matches",
    passwordReset.owner.display_name,
    member.display_name,
  );
  TestValidator.predicate("owner has id", passwordReset.owner.id.length > 0);
  TestValidator.predicate(
    "owner has created_at",
    passwordReset.owner.created_at.length > 0,
  );
}
