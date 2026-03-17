import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_moderator_moderators_create } from "../../../generate/generate_random_reddit_like_moderator_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test community owner adding a moderator directly. Per business rules (section 246), both owners AND moderators can grant moderator roles. The owner has this privilege by default without needing can_add_moderators permission. Steps: 1) Authenticate as member who becomes owner via moderator join, 2) Create a community using authenticated owner connection (automatically becomes owner), 3) Authenticate as a second member to be promoted via moderator join, 4) Owner adds the second member as moderator with can_add_moderators=false (default). Expected result: The API returns IRedditLikeModerator with can_add_moderators=false, member summary with the promoted member's details, community summary, and timestamps. Validates that ownership grants unconditional moderator addition rights.
 *
 * @param connection Base connection to the API server
 */
export async function test_api_moderator_add_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member who becomes owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_moderator_join(ownerConnection, {});
  typia.assert(owner);
  // Step 2: Create a community (automatically becomes owner)
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Authenticate as a second member to be promoted
  const targetConnection: api.IConnection = { host: connection.host };
  const target = await authorize_moderator_join(targetConnection, {});
  typia.assert(target);
  // Step 4: Owner adds the second member as moderator with can_add_moderators=false (default)
  const moderator =
    await generate_random_reddit_like_moderator_moderators_create(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          memberId: target.member.id,
          canAddModerators: false,
        },
      },
    );
  typia.assert(moderator);
  // Step 5: Validate the response
  TestValidator.equals(
    "community matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals("member matches", moderator.member.id, target.member.id);
  TestValidator.equals(
    "can_add_moderators is false",
    moderator.can_add_moderators,
    false,
  );
}
