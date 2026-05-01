import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
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
 * Test that an authenticated member cannot access another member's password reset record.
 *
 * Validates the authorization boundary for password reset record retrieval. The endpoint
 * `/communityHub/members/{username}/password-resets/{resetId}` is strictly scoped to the
 * authenticated member — only the owning member may retrieve their own reset records.
 *
 * Cross-member access attempts must be rejected with HTTP 403 Forbidden before any
 * database lookup is performed, preventing enumeration attacks against password reset
 * tokens belonging to other members.
 *
 * 1. Register and authenticate a member via join to obtain a valid session.
 * 2. Construct a different username guaranteed not to match the authenticated member.
 * 3. Generate a random reset ID.
 * 4. Attempt to retrieve the password reset using the mismatched username.
 * 5. Verify the request is rejected with 403 Forbidden.
 */
export async function test_api_member_password_reset_retrieve_username_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Build a username guaranteed to differ from the authenticated member
  const differentUsername = `other-${member.username}`;
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt cross-member access — must be rejected
  await TestValidator.httpError(
    "cross-member password reset access rejected",
    403,
    async () => {
      await api.functional.communityHub.members.password_resets.at(
        memberConnection,
        { username: differentUsername, resetId },
      );
    },
  );
}
