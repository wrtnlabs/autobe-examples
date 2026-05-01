import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login with a nonexistent email returns 404 Not Found.
 *
 * Verifies that attempting to authenticate with an email address that has never been registered results in the correct error response. The test first registers a member to establish baseline context, then attempts login using a different, unregistered email address.
 *
 * The 404 response confirms that the system correctly identifies the absence of any account record for the provided email, and that no JWT tokens are issued for nonexistent accounts.
 *
 * 1. Register a new member via the join endpoint to establish test context.
 * 2. Attempt to log in with a completely different email address that has never been registered.
 * 3. Verify the response returns HTTP 404 Not Found, confirming no account exists for the provided email.
 */
export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member to establish test context
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Attempt login with a nonexistent email — expect 404
  const nonexistentConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "nonexistent email returns 404",
    404,
    async () => {
      await authorize_member_login(nonexistentConnection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityHubMember.ILogin,
      });
    },
  );
}
