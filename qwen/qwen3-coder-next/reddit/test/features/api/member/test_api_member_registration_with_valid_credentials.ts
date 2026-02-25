import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name();
  const body = {
    email,
    password,
    username,
    displayName: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IRedditCloneMember.IJoin;
  // Register new member
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    { body },
  );
  typia.assert(member);
  // Validate member profile fields
  TestValidator.equals("email matches", member.email, email);
  TestValidator.equals("username matches", member.username, username);
  TestValidator.equals("display name is null", member.displayName, null);
  TestValidator.predicate("has valid UUID", /^[0-9a-f-]{36}$/i.test(member.id));
  TestValidator.equals("karma is 0", member.karma, 0);
  TestValidator.predicate(
    "has valid created timestamp",
    new Date(member.createdAt) <= new Date(),
  );
  // Validate token structure
  TestValidator.equals(
    "has access token",
    typeof member.token.access,
    "string",
  );
  TestValidator.equals(
    "has refresh token",
    typeof member.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "access token not empty",
    member.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token not empty",
    member.token.refresh.length > 0,
  );
  // Validate connection header was updated with access token
  TestValidator.equals(
    "connection has authorization header",
    memberConnection.headers?.Authorization,
    member.token.access,
  );
}
