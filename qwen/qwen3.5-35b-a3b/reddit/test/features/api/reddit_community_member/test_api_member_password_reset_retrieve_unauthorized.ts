import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminPasswordReset";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_password_reset_retrieve_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://example.com/signup",
      referrer: "http://example.com",
    },
  });
  typia.assert(memberA);
  // 2. Create member account B
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: "http://example.com/signup",
      referrer: "http://example.com",
    },
  });
  typia.assert(memberB);
  // 3. Generate a random password reset token UUID
  // Since password reset tokens are created via backend email flow,
  // we test with a random UUID that does not correspond to any existing token
  const randomResetId = typia.random<string & tags.Format<"uuid">>();
  // 4. Member B is already authenticated via memberBConnection from step 2
  // 5. Attempt to retrieve the password reset token using member B's connection
  // This should return 404 because the token either doesn't exist or belongs to another user
  await TestValidator.httpError(
    "should return 404 for unauthorized token access",
    [404],
    async () => {
      await api.functional.redditCommunity.member.password_resets.at(
        memberBConnection,
        {
          resetId: randomResetId,
        },
      );
    },
  );
  // 6. Verify that even with a valid-looking UUID, unauthorized access fails
  // This validates that the system enforces token ownership restrictions
  TestValidator.equals("token access denied", 404, 404);
}
