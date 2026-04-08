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
import { generate_random_reddit_platform_member_password_resets_create } from "../../../generate/generate_random_reddit_platform_member_password_resets_create";
import { prepare_random_reddit_platform_member_password_reset } from "../../../prepare/prepare_random_reddit_platform_member_password_reset";

export async function test_api_member_password_reset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member with randomized credentials
  const joinOutput: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username:
          RandomGenerator.alphaNumeric(8) +
          "_" +
          RandomGenerator.alphaNumeric(3),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(joinOutput);
  // 2. Create member-specific connection for authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${joinOutput.token.access}`,
  };
  // 3. Create password reset token
  const passwordReset: IRedditPlatformMemberPasswordReset =
    await generate_random_reddit_platform_member_password_resets_create(
      memberConnection,
      {
        body: {
          email: joinOutput.email,
        } satisfies IRedditPlatformMemberPasswordReset.ICreate,
      },
    );
  typia.assert(passwordReset);
  // 4. Validate response structure and business logic
  TestValidator.equals(
    "member id from response",
    passwordReset.member_id,
    joinOutput.id,
  );
  TestValidator.equals("used_at is null", passwordReset.used_at, null);
  TestValidator.equals(
    "member username",
    passwordReset.member?.username,
    joinOutput.username,
  );
  TestValidator.equals(
    "member karma",
    passwordReset.member?.karma,
    joinOutput.karma,
  );
  // 5. Validate timestamps: expires_at should be 1 hour after created_at
  const created_at = new Date(passwordReset.created_at);
  const expires_at = new Date(passwordReset.expires_at);
  const timeDifference = expires_at.getTime() - created_at.getTime();
  TestValidator.equals(
    "expires_at is 1 hour after created_at",
    timeDifference,
    3600 * 1000,
  );
}
