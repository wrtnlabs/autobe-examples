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
 * Verify that deleted member accounts cannot authenticate.
 *
 * Validates that account deletion is irreversible and prevents re-authentication even with previously valid credentials. Tests the complete membership lifecycle: registration, deletion, and authentication blockage.
 *
 * Special attention is given to ensuring the authentication system correctly checks the deleted_at flag and rejects login attempts for soft-deleted accounts, preventing compromised or deleted accounts from regaining platform access.
 *
 * 1. Register a member with known email and password credentials.
 * 2. Delete the member account, which sets deleted_at timestamp and cascade-removes all associated data.
 * 3. Attempt login using the same email and password from the deleted account.
 * 4. Verify authentication is rejected with an error.
 */
export async function test_api_member_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate known credentials for reuse
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register member account
  const member = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
    } satisfies DeepPartial<IREdditLikeCommunityMember.IJoin>,
  });
  typia.assert(member);
  // 2. Delete the member account (authenticated call)
  await api.functional.redditLikeCommunity.member.profile.erase(
    memberConnection,
  );
  // 3. Attempt login with deleted account credentials
  const loginConnection: api.IConnection = { host: connection.host };
  // 4. Verify authentication fails
  await TestValidator.error("deleted account cannot login", async () => {
    await authorize_member_login(loginConnection, {
      body: {
        email: member.email,
        password,
      } satisfies IREdditLikeCommunityMember.ILogin,
    });
  });
}
