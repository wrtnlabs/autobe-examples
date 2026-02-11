import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for community moderator registration
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Generate valid registration data
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(32); // bcrypt-hashed password (12+ cost)
  const displayName = RandomGenerator.name();
  // Perform successful community moderator join
  const result = await authorize_community_moderator_join(moderatorConnection, {
    body: {
      email,
      password_hash: passwordHash,
      display_name: displayName,
    } satisfies IRedditCommunityCommunityModerator.IJoin,
  });
  // Validate response structure
  typia.assert(result);
  // Verify essential fields in response
  TestValidator.equals(
    "access_token exists",
    result.access_token.length > 0,
    true,
  );
  TestValidator.equals(
    "refresh_token exists",
    result.refresh_token.length > 0,
    true,
  );
  TestValidator.predicate(
    "expires_in is positive integer",
    result.expires_in > 0,
  );
  TestValidator.equals(
    "token structure valid",
    result.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token.refresh exists",
    result.token.refresh.length > 0,
    true,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    !!result.token.expired_at.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|(?:\+|\-)\d{2}:\d{2})$/,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    !!result.token.refreshable_until.match(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|(?:\+|\-)\d{2}:\d{2})$/,
    ),
  );
}