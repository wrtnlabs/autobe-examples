import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Verifies that a refresh token becomes invalid immediately after the associated member account is deleted.
 *
 * This test ensures the business rule that authentication tokens are strictly tied to active accounts is enforced. When a member account undergoes soft-deletion (setting deleted_at), all existing refresh tokens associated with that account must be rejected by the system. This prevents deleted users from regaining session access via stale tokens, maintaining security integrity and account lifecycle consistency.
 *
 * The test workflow involves registering a new member to obtain valid authentication credentials, performing an account deletion operation to simulate account closure, and then attempting to use the previously obtained refresh token. The system must respond with a 401 Unauthorized error, confirming that the token validation logic correctly checks the account status and rejects tokens for deleted accounts.
 *
 * 1. Register a new member account to obtain initial refresh token.
 * 2. Delete the authenticated member's account.
 * 3. Attempt to refresh the token using the previously obtained refresh token.
 * 4. Verify the system rejects the request with 401 Unauthorized.
 */
export async function test_api_auth_member_refresh_after_account_deletion(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Delete the member's account
  await api.functional.redditLikeCommunity.member.profile.erase(
    memberConnection,
  );
  // 3. & 4. Attempt to refresh and verify 401 rejection
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "should reject refresh token for deleted account",
    async () => {
      await authorize_member_refresh(refreshConnection, {
        body: {
          refresh: authorized.token.refresh,
        } satisfies IREdditLikeCommunityMember.IRefresh,
      });
    },
  );
}
