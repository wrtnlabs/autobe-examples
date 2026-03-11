import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_validation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate a random UUID for password reset token validation
  // In simulation mode, this will return mock data with valid structure
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Validate password reset token - returns token metadata without exposing actual token
  const resetSummary: IDiscussionBoardMemberPasswordReset.ISummary =
    await api.functional.discussionBoard.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(resetSummary);
  // 4. Validate response structure and business logic
  TestValidator.equals("reset token has valid UUID", resetSummary.id, resetId);
  TestValidator.predicate(
    "token has expiration timestamp",
    resetSummary.expires_at !== null && resetSummary.expires_at !== undefined,
  );
  TestValidator.predicate(
    "token has creation timestamp",
    resetSummary.created_at !== null && resetSummary.created_at !== undefined,
  );
  TestValidator.equals(
    "token is unused (used_at is null)",
    resetSummary.used_at,
    null,
  );
}
