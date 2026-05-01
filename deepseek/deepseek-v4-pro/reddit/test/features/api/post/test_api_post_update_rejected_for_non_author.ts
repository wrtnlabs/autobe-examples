import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_communities_posts_create } from "../../../generate/generate_random_community_hub_communities_posts_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_post } from "../../../prepare/prepare_random_community_hub_post";

/**
 * Verify that a member who is not the author of a post cannot edit it.
 *
 * Ensures post ownership is enforced at the authorization level. Only the
 * original author may modify a post's content — any other authenticated member
 * is rejected with a 403 status.
 *
 * 1. Author registers and authenticates via join.
 * 2. Author creates a community and subscribes to it.
 * 3. Author publishes a text post in the community.
 * 4. A second, different member registers and authenticates.
 * 5. Second member attempts to patch the author's post title.
 * 6. Validates the request is rejected with 403.
 */
export async function test_api_post_update_rejected_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Author registration and authentication
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {});
  // 2. Author creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      authorConnection,
      {},
    );
  // 3. Author subscribes to the community
  await api.functional.communityHub.member.communities.subscriptions.create(
    authorConnection,
    { communityName: community.name },
  );
  // 4. Author creates a text post
  const post = await generate_random_community_hub_communities_posts_create(
    authorConnection,
    {
      params: { communityName: community.name },
    },
  );
  typia.assert(post);
  // 5. Second member registration and authentication
  const otherConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherConnection, {});
  // 6. Second member attempts unauthorized edit — must be rejected with 403
  await TestValidator.httpError(
    "non-author cannot edit another member's post",
    403,
    async () => {
      await api.functional.communityHub.posts.update(otherConnection, {
        postId: post.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies ICommunityHubPost.IUpdate,
      });
    },
  );
}
