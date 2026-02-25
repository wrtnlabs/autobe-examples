import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";

export async function test_api_community_posts_new_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: `${RandomGenerator.name()}@example.com`,
      password: "1234",
      username: `User ${RandomGenerator.alphaNumeric(5)}`,
    },
  });
  typia.assert(memberAuth);
  // 2. Create community for posts retrieval testing
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: {
        name: `Community ${RandomGenerator.alphaNumeric(5)}`,
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  typia.assert(community);
  // 3. Retrieve posts with 'new' sorting
  const postsPage: IPageIRedditPostText.ISummary =
    await api.functional.reddit.member.communities.posts.index(
      memberConnection,
      {
        communityId: community.id,
        body: { sort: "new" },
      },
    );
  typia.assert(postsPage);
  // 4. Validate sorting order: newest first
  const expectedIds = [...postsPage.data]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((post) => ({ id: post.id }));
  const actualIds = postsPage.data.map((post) => ({ id: post.id }));
  TestValidator.index("new sorting order", expectedIds, actualIds);
}
