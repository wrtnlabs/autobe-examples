import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create new member account using join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const joinedMember = await authorize_member_join(joinConnection, {
    body: memberData,
  });
  typia.assert(joinedMember);
  // Step 2: Login with the created member credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginMember = await authorize_member_login(loginConnection, {
    body: {
      email: memberData.email,
      password: memberData.password,
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(loginMember);
  // Step 3: Validate the response structure and data
  // Check that the response contains all required fields
  TestValidator.equals("email matches", loginMember.email, memberData.email);
  TestValidator.equals(
    "username matches",
    loginMember.username,
    memberData.username,
  );
  TestValidator.equals(
    "display_name matches",
    loginMember.display_name,
    memberData.display_name,
  );
  TestValidator.equals("bio matches", loginMember.bio, memberData.bio);
  TestValidator.equals(
    "avatar_url matches",
    loginMember.avatar_url,
    memberData.avatar_url,
  );
  // Check token structure
  TestValidator.predicate(
    "has access token",
    typeof loginMember.token.access === "string",
  );
  TestValidator.predicate(
    "has refresh token",
    typeof loginMember.token.refresh === "string",
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    typeof loginMember.token.expired_at === "string",
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    typeof loginMember.token.refreshable_until === "string",
  );
  // Validate member IDs match between join and login
  TestValidator.equals("member ID matches", loginMember.id, joinedMember.id);
}
