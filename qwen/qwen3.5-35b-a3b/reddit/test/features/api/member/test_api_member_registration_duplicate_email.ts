import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Define common registration data
  const commonEmail = "test@example.com";
  const commonHref = "https://example.com/join";
  const commonReferrer = "https://example.com";
  // First registration attempt - should succeed
  const user1Connection: api.IConnection = { host: connection.host };
  const user1JoinBody = {
    email: commonEmail,
    password: "password1",
    username: "uniqueuser1",
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IRedditCommunityMember.IJoin;
  const firstUser = await authorize_member_join(user1Connection, {
    body: user1JoinBody,
  });
  typia.assert(firstUser);
  // Validate successful registration response
  TestValidator.equals("first user email", firstUser.email, commonEmail);
  TestValidator.equals(
    "first user username",
    firstUser.username,
    "uniqueuser1",
  );
  typia.assert(firstUser.token);
  TestValidator.predicate(
    "has access token",
    firstUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    firstUser.token.refresh.length > 0,
  );
  // Second registration attempt - should fail with duplicate email (409 Conflict)
  const user2Connection: api.IConnection = { host: connection.host };
  const user2JoinBody = {
    email: commonEmail,
    password: "password2",
    username: "uniqueuser2",
    href: commonHref,
    referrer: commonReferrer,
  } satisfies IRedditCommunityMember.IJoin;
  await TestValidator.httpError("duplicate email rejection", 409, async () => {
    await authorize_member_join(user2Connection, { body: user2JoinBody });
  });
}
