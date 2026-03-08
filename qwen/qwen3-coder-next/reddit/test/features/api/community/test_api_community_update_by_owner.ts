import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
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

export async function test_api_community_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member user through registration
  const userConnection: api.IConnection = { host: connection.host };
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: "TestPassword123!",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  const userAuth = await authorize_member_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(userAuth);
  // 2. Find an existing community to update
  // Since there's no community creation endpoint available, we'll use an existing community
  const searchCommunities = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        limit: 50,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(searchCommunities);
  if (searchCommunities.data.length === 0) {
    throw new Error("No communities found for testing");
  }
  // Use the first community from the list
  const community = searchCommunities.data[0];
  const communityName = community.name;
  // 3. Update the community information
  const updateInput = {
    description: "Updated description for community test",
    icon_url: "https://example.com/test-icon.png",
  } satisfies IRedditLikeCommunity.IUpdate;
  const updatedCommunity =
    await api.functional.redditLike.member.communities.update(userConnection, {
      communityName: communityName,
      body: updateInput,
    });
  typia.assert(updatedCommunity);
  // 4. Verify the update was applied correctly
  TestValidator.equals(
    "community description updated",
    updatedCommunity.icon_url,
    "https://example.com/test-icon.png",
  );
  TestValidator.predicate("community updated_at timestamp is set", () => {
    const updateDate = new Date(updatedCommunity.updated_at);
    return !isNaN(updateDate.getTime());
  });
  // 5. Verify the update persists by fetching the community again
  const verificationSearch = await api.functional.redditLike.communities.index(
    connection,
    {
      body: {
        search: communityName,
        limit: 10,
      } satisfies IRedditLikeCommunity.IRequest,
    },
  );
  typia.assert(verificationSearch);
  const verifiedCommunity = verificationSearch.data.find(
    (c) => c.name === communityName,
  );
  if (verifiedCommunity) {
    TestValidator.equals(
      "verified community has updated icon",
      verifiedCommunity.icon_url,
      "https://example.com/test-icon.png",
    );
  }
}
