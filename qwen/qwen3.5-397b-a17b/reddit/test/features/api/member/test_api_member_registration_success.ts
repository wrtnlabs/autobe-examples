import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique registration data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const username = RandomGenerator.name(1);
  const display_name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create member connection and register
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IRedditCloneMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password,
        username,
        display_name,
        href,
        referrer,
        ip,
      } satisfies IRedditCloneMember.IJoin,
    });
  // Validate response structure
  typia.assert(authorized);
  // Validate member fields
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("username matches", authorized.username, username);
  TestValidator.equals(
    "display_name matches",
    authorized.display_name,
    display_name,
  );
  TestValidator.predicate("id is UUID", /^[0-9a-f-]{36}$/i.test(authorized.id));
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(authorized.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(authorized.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for new account",
    authorized.deleted_at,
    null,
  );
  // Validate karma_score initialized to 0
  TestValidator.equals(
    "karma_score initialized to 0",
    authorized.karma_score.score,
    0,
  );
  TestValidator.predicate(
    "karma_score has id",
    authorized.karma_score.id !== undefined,
  );
  TestValidator.equals(
    "karma_score member id matches",
    authorized.karma_score.member.id,
    authorized.id,
  );
  TestValidator.equals(
    "karma_score member username matches",
    authorized.karma_score.member.username,
    authorized.username,
  );
  // Validate token structure
  TestValidator.predicate(
    "access token exists",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(Date.parse(authorized.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(Date.parse(authorized.token.refreshable_until)),
  );
  // Verify token can be used for authentication (check connection was updated)
  TestValidator.predicate(
    "connection has authorization header",
    memberConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    memberConnection.headers?.Authorization,
    authorized.token.access,
  );
}
