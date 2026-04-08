import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_password_reset_token_retrieve_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username:
      RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditPlatformMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(member);
  // 2. Generate a password reset token record (simulate via typia.random)
  const passwordReset: IRedditPlatformMemberPasswordReset =
    typia.random<IRedditPlatformMemberPasswordReset>();
  typia.assert(passwordReset);
  // Manually set expires_at to a past value (simulate token expiration)
  const pastTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const expiredPasswordReset: IRedditPlatformMemberPasswordReset = {
    ...passwordReset,
    expires_at: pastTime,
  };
  // 3. Retrieve the token record by its ID
  const retrievedPasswordReset =
    await api.functional.redditPlatform.member.password_resets.at(
      memberConnection,
      {
        resetId: expiredPasswordReset.id,
      },
    );
  typia.assert(retrievedPasswordReset);
  // 4. Validate that the retrieved token record has the correct structure
  TestValidator.equals(
    "token id matches",
    retrievedPasswordReset.id,
    expiredPasswordReset.id,
  );
  TestValidator.equals(
    "member_id matches",
    retrievedPasswordReset.member_id,
    expiredPasswordReset.member_id,
  );
  TestValidator.equals(
    "token value is present",
    retrievedPasswordReset.token.length > 0,
    true,
  );
  TestValidator.equals(
    "created_at is set",
    retrievedPasswordReset.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "expires_at is set",
    retrievedPasswordReset.expires_at !== undefined,
    true,
  );
  TestValidator.equals(
    "used_at is null (never used)",
    retrievedPasswordReset.used_at,
    null,
  );
  TestValidator.equals(
    "deleted_at is null",
    retrievedPasswordReset.deleted_at,
    null,
  );
  // 5. Validate member summary exists and has correct structure
  TestValidator.predicate(
    "member exists in response",
    retrievedPasswordReset.member !== undefined,
  );
  if (retrievedPasswordReset.member) {
    TestValidator.equals(
      "member id matches",
      retrievedPasswordReset.member.id,
      expiredPasswordReset.member_id,
    );
    TestValidator.equals(
      "member username is set",
      retrievedPasswordReset.member.username.length > 0,
      true,
    );
    TestValidator.equals(
      "member karma is set",
      retrievedPasswordReset.member.karma !== undefined,
      true,
    );
    TestValidator.equals(
      "member created_at is set",
      retrievedPasswordReset.member.created_at !== undefined,
      true,
    );
  }
  // 6. Validate that token is expired (expires_at is in the past)
  TestValidator.predicate(
    "expires_at is in the past",
    new Date(retrievedPasswordReset.expires_at) < new Date(),
  );
}
