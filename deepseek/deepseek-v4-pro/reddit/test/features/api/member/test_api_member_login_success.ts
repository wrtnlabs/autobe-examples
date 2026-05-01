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
 * Test successful member login with valid credentials.
 *
 * Validates the complete login flow: a new member is first registered through the join endpoint, then logs in using the same email and password credentials via the login endpoint. Ensures the login response returns a fully populated ICommunityHubMember.IAuthorized body containing the member's profile data, JWT token pair, and empty posts/comments arrays for a fresh account.
 *
 * Special attention is given to verifying that the login response includes all required authentication fields — access token, refresh token, expired_at timestamp, and refreshable_until timestamp — and that the member profile fields (id, username, display_name matching the username default, karma initialized to zero) are correctly populated. The test also confirms that the login operates on a clean connection independent of any prior authentication state.
 *
 * 1. Generate random credentials (email, password, username) for a new member.
 * 2. Register the member via authorize_member_join on a dedicated join connection.
 * 3. Create a separate login connection and authenticate via authorize_member_login using the same credentials.
 * 4. Validate the login response: typia.assert for type safety, then verify profile fields and empty posts/comments arrays.
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate credentials for the new member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  // 2. Register the member via join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: { email, password, username },
  });
  typia.assert(joinedMember);
  // 3. Login with the same credentials on a fresh connection
  const loginConnection: api.IConnection = { host: connection.host };
  const loginBody = {
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityHubMember.ILogin;
  const authorized = await authorize_member_login(loginConnection, {
    body: loginBody,
  });
  typia.assert(authorized);
  // 4. Validate response — typia.assert already validates full type structure
  TestValidator.equals("username matches", authorized.username, username);
  TestValidator.equals(
    "display_name defaults to username",
    authorized.display_name,
    username,
  );
  TestValidator.equals("karma initialized to zero", authorized.karma, 0);
  TestValidator.predicate(
    "posts array is empty for new member",
    authorized.posts.length === 0,
  );
  TestValidator.predicate(
    "comments array is empty for new member",
    authorized.comments.length === 0,
  );
}
