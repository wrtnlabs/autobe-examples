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

export async function test_api_community_deletion_failed_nonexistent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community owner actor
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const ownerAuth = await authorize_community_owner_join(
    communityOwnerConnection,
    { body: ownerCredentials },
  );
  // 2. Login as community owner to obtain valid session
  const loginConnection: api.IConnection = { host: connection.host };
  const loginAuth = await authorize_community_owner_login(loginConnection, {
    body: {
      email: ownerCredentials.email,
      password: ownerCredentials.password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Create a community using the authenticated community owner
  const createdCommunity =
    await api.functional.redditCommunity.communityOwner.communities.create(
      loginConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(createdCommunity);
  // 4. Delete the created community using the community owner connection
  await api.functional.redditCommunity.member.communities.erase(
    loginConnection,
    {
      id: createdCommunity.id,
    },
  );
  // 5. Attempt to delete the same community again (should fail with 404)
  // This simulates deletion of a non-existent (already deleted) community
  const deleteSecondTime = async () => {
    await api.functional.redditCommunity.member.communities.erase(
      loginConnection,
      {
        id: createdCommunity.id,
      },
    );
  };
  // 6. Validate that the second deletion attempt fails with 404 Not Found
  await TestValidator.httpError(
    "delete non-existent community should return 404",
    404,
    deleteSecondTime,
  );
}
