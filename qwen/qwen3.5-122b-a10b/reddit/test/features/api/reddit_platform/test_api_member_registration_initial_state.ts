import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_initial_state(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection for registration
  const memberConnection: api.IConnection = { host: connection.host };
  // Register new member with valid credentials
  const authorized: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<
          string &
            tags.MinLength<1> &
            tags.MaxLength<255> &
            tags.Format<"email">
        >(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IRedditPlatformMember.IJoin,
    });
  typia.assert(authorized);
  // Validate initial state: karma_score must be 0
  TestValidator.equals(
    "karma score initialized to zero",
    authorized.karma_score,
    0,
  );
  // Validate initial state: display_name must be null
  TestValidator.equals(
    "display name initialized to null",
    authorized.display_name,
    null,
  );
  // Validate initial state: bio must be null
  TestValidator.equals("bio initialized to null", authorized.bio, null);
  // Validate initial state: avatar must be null
  TestValidator.equals("avatar initialized to null", authorized.avatar, null);
  // Validate JWT tokens are provided for authentication
  TestValidator.predicate(
    "access token exists",
    authorized.accessToken.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token has expiration",
    authorized.expiresAt.length > 0,
  );
  TestValidator.predicate(
    "token has refreshable until",
    authorized.token.refreshable_until.length > 0,
  );
  // Validate member profile data
  TestValidator.predicate("member has id", authorized.id.length > 0);
  TestValidator.predicate(
    "member has username",
    authorized.username.length > 0,
  );
  TestValidator.predicate("member has email", authorized.email.length > 0);
  TestValidator.predicate(
    "member has created_at",
    authorized.created_at.length > 0,
  );
  TestValidator.predicate(
    "member has updated_at",
    authorized.updated_at.length > 0,
  );
}