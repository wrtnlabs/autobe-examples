import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
 * 1. Create member account using join endpoint
 * 2. Login with same credentials
 * 3. Verify authentication tokens and member info
 */
export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account using join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const joinCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberCreated = await authorize_member_join(joinConnection, {
    body: joinCredentials,
  });
  typia.assert(memberCreated);
  // Step 2: Login with same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinCredentials.email,
    password: joinCredentials.password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.ILogin;
  const memberLoggedIn = await authorize_member_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(memberLoggedIn);
  // Step 3: Validate login response matches created member
  TestValidator.equals(
    "member ID should match",
    memberLoggedIn.id,
    memberCreated.id,
  );
  TestValidator.equals(
    "username should match",
    memberLoggedIn.username,
    memberCreated.username,
  );
  TestValidator.equals(
    "email should match",
    memberLoggedIn.email,
    memberCreated.email,
  );
  TestValidator.equals(
    "nickname should match",
    memberLoggedIn.nickname,
    memberCreated.nickname,
  );
  TestValidator.equals(
    "email_verified should be false",
    memberLoggedIn.email_verified,
    false,
  );
  TestValidator.equals(
    "karma should be 0 for new member",
    memberLoggedIn.karma,
    0,
  );
  TestValidator.equals(
    "posts array should be empty",
    memberLoggedIn.posts.length,
    0,
  );
  TestValidator.equals(
    "comments array should be empty",
    memberLoggedIn.comments.length,
    0,
  );
  TestValidator.equals("avatar should be null", memberLoggedIn.avatar, null);
  TestValidator.equals("bio should be null", memberLoggedIn.bio, null);
  // Validate that last_login_at was null initially and now is set
  TestValidator.equals(
    "initial last_login_at should be null",
    memberCreated.last_login_at,
    null,
  );
  TestValidator.predicate(
    "last_login_at should be updated after login",
    memberLoggedIn.last_login_at !== null,
  );
  if (memberLoggedIn.last_login_at !== null) {
    const loginTime = new Date(memberLoggedIn.last_login_at);
    const currentTime = new Date();
    const timeDiff = Math.abs(currentTime.getTime() - loginTime.getTime());
    TestValidator.predicate("last_login_at should be recent", timeDiff < 60000); // within 1 minute
  }
  // Validate token structure
  TestValidator.predicate(
    "access token should exist",
    memberLoggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should exist",
    memberLoggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at should be future date",
    new Date(memberLoggedIn.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "token refreshable_until should be future date",
    new Date(memberLoggedIn.token.refreshable_until) > new Date(),
  );
  // Validate timestamps
  TestValidator.predicate(
    "registered_at should be valid date",
    new Date(memberLoggedIn.registered_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "created_at should be valid date",
    new Date(memberLoggedIn.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    new Date(memberLoggedIn.updated_at).toString() !== "Invalid Date",
  );
  // Step 4: Verify authentication tokens work for subsequent requests
  // The token is already validated above, and the authorize_member_login function
  // automatically sets the Authorization header on the loginConnection
  // Since there are no other member-specific endpoints in the provided SDK,
  // we've validated all aspects of successful login
}
