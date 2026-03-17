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

export async function test_api_post_deletion_denied_for_non_author_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member #1 (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // Step 2: Create a community as the author
  const community = await generate_random_community_member_communities_create(
    authorConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Author subscribes to their own community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      authorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Author creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    authorConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Register member #2 (unauthorized requester — not author, not moderator)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(unauthorizedConnection, {});
  // Step 6 & 7: Attempt to delete the post as member #2; expect 403 Forbidden
  await TestValidator.httpError(
    "non-author non-moderator cannot delete post",
    403,
    async () => {
      await api.functional.community.member.posts.erase(
        unauthorizedConnection,
        {
          postId: post.id,
        },
      );
    },
  );
}
