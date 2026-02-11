import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_deletion_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const communityOwnerResponse = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(communityOwnerResponse);
  // 2. Log in as the community owner to obtain a valid session token
  const loginResponse = await authorize_community_owner_login(
    communityOwnerConnection,
    {
      body: {
        email: joinEmail,
        password: joinPassword,
      } satisfies IRedditCommunityCommunityOwner.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Create a new community owned by the community owner
  const createdCommunity =
    await generate_random_reddit_community_community_owner_communities_create(
      communityOwnerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 4. Delete the community using the community owner's authenticated connection
  await api.functional.redditCommunity.member.communities.erase(
    communityOwnerConnection,
    {
      id: createdCommunity.id,
    },
  );
  // 5. Verify the community is no longer accessible - attempt to delete it again
  try {
    await api.functional.redditCommunity.member.communities.erase(
      communityOwnerConnection,
      {
        id: createdCommunity.id,
      },
    );
    // If we reach here, the community was not properly deleted
    throw new Error("Community should not be accessible after deletion");
  } catch (error) {
    // Expected to throw HttpError with status 404 Not Found
    if (!typia.is<api.HttpError>(error) || error.status !== 404) {
      throw error;
    }
  }
}
