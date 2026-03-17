import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Test updating community name to a unique value that does not conflict with any existing community.
 * The member first creates a community, then attempts to rename it to a different unique name.
 * The system validates name uniqueness across the entire platform (case-insensitive check) and allows the update if no other community uses the new name.
 * This validates the business rule that community names must remain unique across the platform - a critical constraint for community identification and URL routing.
 */
export async function test_api_community_update_name_uniqueness_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Create a community with an initial name
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Generate a new unique name for the community
  const newUniqueName = `Community-${RandomGenerator.alphaNumeric(8)}`;
  // Step 4: Update the community name to a new unique name
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(
      memberConnection,
      {
        communityId: community.id,
        body: {
          name: newUniqueName,
        } satisfies IRedditLikeCommunity.IUpdate,
      },
    );
  typia.assert(updatedCommunity);
  // Step 5: Verify the name was successfully updated
  TestValidator.equals(
    "community name updated correctly",
    updatedCommunity.name,
    newUniqueName,
  );
}
