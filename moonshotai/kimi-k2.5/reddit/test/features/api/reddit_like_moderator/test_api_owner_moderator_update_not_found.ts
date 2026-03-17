import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test that updating a non-existent moderator returns 404 Not Found.
 * An owner authenticates, creates a community (as a member actor),
 * then attempts to update permissions for a moderator role using a
 * random UUID that doesn't exist in the system. Validates proper
 * resource existence checking and error handling.
 *
 * According to the API implementation, the moderator existence check
 * occurs before ownership validation, ensuring 404 is returned for
 * non-existent moderators.
 */
export async function test_api_owner_moderator_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection for moderator management operations
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // Create member connection for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Create a community to establish valid ownership context for moderator management
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Generate a random UUID for a moderator that doesn't exist
  const nonExistentModeratorId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to update the non-existent moderator and expect 404 Not Found
  await TestValidator.httpError(
    "non-existent moderator returns 404",
    404,
    async () => {
      await api.functional.redditLike.owner.moderators.update(ownerConnection, {
        moderatorId: nonExistentModeratorId,
        body: { role: "admin" } satisfies IRedditLikeModerator.IUpdate,
      });
    },
  );
}
