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
  // Step 1: Create member account using join endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeMember.IJoin;
  const joinedMember = await api.functional.redditLike.auth.member.join(
    memberConnection,
    { body: joinInput },
  );
  typia.assert(joinedMember);
  // Step 2: Login with the created member credentials
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
  } satisfies IRedditLikeMember.ILogin;
  const loggedMember = await api.functional.redditLike.auth.member.login(
    memberConnection,
    { body: loginInput },
  );
  typia.assert(loggedMember);
  // Step 3: Validate IRedditLikeMember.IAuthorized structure
  TestValidator.equals("email matches", loggedMember.email, joinInput.email);
  TestValidator.equals(
    "username matches",
    loggedMember.username,
    joinInput.username,
  );
  TestValidator.equals(
    "display_name matches",
    loggedMember.display_name,
    joinInput.displayName,
  );
  // Step 4: Verify member summary exists and contains required fields
  typia.assert<IRedditLikeMember.ISummary>(loggedMember.member);
  TestValidator.equals(
    "member.id matches",
    loggedMember.member.id,
    loggedMember.id,
  );
  TestValidator.equals(
    "member.username matches",
    loggedMember.member.username,
    loggedMember.username,
  );
  // Step 5: Validate authorization token structure
  typia.assert<IAuthorizationToken>(loggedMember.token);
  TestValidator.predicate(
    "expired_at exists",
    () => loggedMember.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    () => loggedMember.token.refreshable_until !== undefined,
  );
  // Step 6: Verify JWT token formats
  TestValidator.predicate(
    "access token format",
    () => loggedMember.token.access.length > 10,
  );
  TestValidator.predicate(
    "refresh token format",
    () => loggedMember.token.refresh.length > 10,
  );
}
