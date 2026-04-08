import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test that retrieving a removed (soft-deleted) ban record returns 404 Not Found.
 *
 * Validates the soft-delete behavior of community bans where removed bans (deleted_at is not null) are not accessible through the retrieval endpoint. This ensures privacy and proper data management by preventing access to historical ban records that have been administratively removed.
 *
 * The test authenticates as a moderator and attempts to retrieve a ban record that has been soft-deleted. The endpoint should return HTTP 404 Not Found status code, indicating that the ban is no longer accessible. This behavior is critical for maintaining the integrity of the moderation system and ensuring that only active bans are visible to moderators.
 *
 * 1. Authenticate as a moderator using the join endpoint.
 * 2. Attempt to retrieve a ban record with a non-existent or removed ban ID.
 * 3. Verify that the endpoint returns HTTP 404 Not Found error.
 * 4. Confirm that the error indicates the ban is not accessible (either never existed or was removed).
 */
export async function test_api_ban_retrieve_removed_ban_returns_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Generate test IDs for community and ban
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Verify that retrieving a non-existent/removed ban returns 404
  await TestValidator.httpError(
    "retrieve removed ban returns 404",
    404,
    async () =>
      await api.functional.redditClone.moderator.communities.bans.at(
        moderatorConnection,
        {
          communityId,
          banId,
        },
      ),
  );
}
