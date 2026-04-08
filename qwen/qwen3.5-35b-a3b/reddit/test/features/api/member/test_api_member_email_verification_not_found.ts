import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_email_verification_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to establish authentication
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new connection with the member's auth token
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: { ...connection.headers, Authorization: memberAuth.token.access },
  };
  // 3. Generate a non-existent UUID for testing
  const nonExistentId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000000";
  // 4. Attempt to retrieve the non-existent email verification
  // Expected: 404 Not Found
  await TestValidator.httpError(
    "non-existent verification returns 404",
    404,
    async () => {
      await api.functional.redditPlatform.member.email_verifications.at(
        memberConnection,
        {
          verificationId: nonExistentId,
        },
      );
    },
  );
}
