import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account with alice credentials
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: "alice@example.com",
      password: "SecurePass123!",
      username: "alice",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Attempt to login with the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_member_login(loginConnection, {
    body: {
      email: "alice@example.com",
      password: "SecurePass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResponse);
  // 3. Validate login response
  TestValidator.equals("username is alice", loginResponse.username, "alice");
  TestValidator.equals(
    "email is alice@example.com",
    loginResponse.email,
    "alice@example.com",
  );
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      loginResponse.id,
    ),
  );
  TestValidator.predicate(
    "has valid JWT access token",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid JWT refresh token",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has profile with display_name",
    loginResponse.profile?.display_name !== undefined,
  );
  TestValidator.predicate(
    "has karma object",
    loginResponse.karma !== undefined,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    loginResponse.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    loginResponse.token.refreshable_until !== undefined,
  );
}
