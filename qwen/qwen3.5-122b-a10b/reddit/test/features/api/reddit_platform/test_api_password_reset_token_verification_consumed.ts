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

export async function test_api_password_reset_token_verification_consumed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset token by calling the index endpoint
  // This creates a new password reset token for the member
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
  // Find the most recent reset token for this member
  if (resetRequest.data.length === 0) {
    throw new Error("No password reset tokens found for member");
  }
  const resetToken = resetRequest.data[resetRequest.data.length - 1];
  typia.assert(resetToken);
  // 3. Verify the token once (this consumes/soft-deletes it)
  const firstVerify =
    await api.functional.redditPlatform.member.password_resets.verify(
      memberConnection,
      {
        resetId: resetToken.id,
      },
    );
  typia.assert(firstVerify);
  // 4. Attempt to verify the same token again - should fail with 404
  await TestValidator.httpError(
    "consumed token should return 404 Not Found",
    404,
    async () => {
      await api.functional.redditPlatform.member.password_resets.verify(
        memberConnection,
        {
          resetId: resetToken.id,
        },
      );
    },
  );
}