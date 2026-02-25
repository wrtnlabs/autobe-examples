import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_communities_moderators_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_moderators_create";
import { prepare_random_reddit_community_community_moderator } from "../../../prepare/prepare_random_reddit_community_community_moderator";

export async function test_api_community_moderators_list_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a community owner account for authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner: IRedditCommunityCommunityOwner.IAuthorized =
    await authorize_community_owner_join(ownerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    });
  typia.assert(owner);
  // 2. Create a community using the owner connection
  // Note: The community creation endpoint is not provided, so we assume it
  // has been created in a previous step or we need to use a different approach.
  // Since we don't have the API function to create a community, we use a predefined UUID
  // for testing, or we need to create a community via another means.
  // We'll create a random UUID as the community ID since community creation
  // endpoint is not provided in the available API functions.
  const communityId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a member to assign as moderator
  // Note: All entity types except community owner have been restricted.
  // We must create a member ID, but since member creation is not in the available functions,
  // we'll create a random UUID as the user ID as an alternative.
  const memberId: string = typia.random<string & tags.Format<"uuid">>();
  // 4. Assign the member as a moderator to the community using the owner connection
  const moderatorAssignment: IRedditCommunityCommunityModerator =
    await api.functional.redditCommunity.communityOwner.communities.moderators.create(
      ownerConnection,
      {
        communityId: communityId,
        body: {
          userId: memberId,
        } satisfies IRedditCommunityCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Use the owner connection to list all moderators of the community
  const moderators: IRedditCommunityModerator[] =
    typia.assert<Array<IRedditCommunityModerator>>(
      await api.functional.redditCommunity.communities.moderators.at(
        ownerConnection,
        {
          communityId: communityId,
        },
      )
    );
  // 6. Validate response
  TestValidator.equals("moderator count matches", moderators.length, 1);
  TestValidator.equals(
    "moderator user ID matches",
    moderators[0].user.id,
    memberId,
  );
  TestValidator.equals(
    "moderator community ID matches",
    moderators[0].community.id,
    communityId,
  );
  TestValidator.predicate("created_at is ISO datetime", () => {
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    return isoRegex.test(moderators[0].created_at);
  });
}