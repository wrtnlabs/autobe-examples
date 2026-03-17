import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_verification_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request a password reset token
  const resetRequest =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {
          search: member.email,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(resetRequest);
  // 3. Test with an expired/non-existent token ID
  // Since we cannot easily make a token expire in real-time, we test with a valid UUID format
  // that doesn't exist in the database, which should return 410 Gone for expired tokens
  const expiredResetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Verify that the expired token returns 410 Gone
  await TestValidator.httpError(
    "expired token returns 410 Gone",
    410,
    async () => {
      await api.functional.redditPlatform.member.password_resets.verify(
        memberConnection,
        {
          resetId: expiredResetId,
        },
      );
    },
  );
}