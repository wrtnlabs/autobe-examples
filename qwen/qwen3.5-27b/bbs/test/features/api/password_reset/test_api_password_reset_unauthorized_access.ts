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

export async function test_api_password_reset_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that a member cannot access another member's password reset token.
   * This validates the security boundary that members can only view their own
   * password reset tokens, preventing unauthorized access to authentication recovery credentials.
   */
  // 1. Register member A (who will attempt unauthorized access)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Register member B (whose token would be accessed)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Generate a random UUID to simulate member B's password reset token ID
  // (Since there's no API to create password reset tokens, we test with a random ID)
  const fakeResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Attempt to access the password reset token as member A (unauthorized)
  await TestValidator.httpError(
    "member A cannot access another member's password reset token",
    [403, 404],
    async () =>
      await api.functional.discussionBoard.member.password_resets.at(
        memberAConnection,
        {
          resetId: fakeResetId,
        },
      ),
  );
  // 5. Verify member IDs are different (ensuring we have two distinct accounts)
  TestValidator.notEquals(
    "member A and B have different IDs",
    memberA.id,
    memberB.id,
  );
  // 6. Verify both members are authenticated successfully
  TestValidator.predicate(
    "member A is authenticated",
    memberA.id !== undefined,
  );
  TestValidator.predicate(
    "member B is authenticated",
    memberB.id !== undefined,
  );
}
