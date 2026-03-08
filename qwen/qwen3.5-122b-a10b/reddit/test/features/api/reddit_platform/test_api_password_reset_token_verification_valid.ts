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

export async function test_api_password_reset_token_verification_valid(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
      username: typia.random<string & tags.MinLength<1> & tags.MaxLength<50>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request a password reset token (creates a new token for the member)
  const passwordResetConnection: api.IConnection = { host: connection.host };
  const passwordResetList =
    await api.functional.redditPlatform.member.password_resets.index(
      passwordResetConnection,
      {
        body: {
          search: member.email,
        } satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResetList);
  // Extract the reset record (should have at least one token)
  TestValidator.predicate(
    "password reset token exists",
    passwordResetList.data.length > 0,
  );
  const resetRecord = passwordResetList.data[0];
  typia.assert(resetRecord);
  // 3. Verify the password reset token
  const verifyConnection: api.IConnection = { host: connection.host };
  const verification =
    await api.functional.redditPlatform.member.password_resets.verify(
      verifyConnection,
      {
        resetId: resetRecord.id,
      },
    );
  typia.assert(verification);
  // 4. Validate the verification response
  TestValidator.equals("status is valid", verification.status, "valid");
  TestValidator.equals("email matches", verification.email, member.email);
  // Note: token value is NOT exposed in response (security requirement)
  // This is validated by the response type IVerify which doesn't include a token field
}