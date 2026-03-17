import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_post_update_denied_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A (the post author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A subscribes to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post in the community
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: originalTitle,
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, originalTitle);
  // 5. Register and authenticate Member B (a different member who is NOT the post author)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 6. Member B attempts to update Member A's post — should receive 403 Forbidden
  await TestValidator.httpError(
    "non-author member cannot update another member's post",
    403,
    async () => {
      await api.functional.community.member.posts.update(memberBConnection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPost.IUpdate,
      });
    },
  );
}
