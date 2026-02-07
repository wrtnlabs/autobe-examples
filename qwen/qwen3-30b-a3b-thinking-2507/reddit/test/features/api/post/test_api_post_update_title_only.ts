import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_update_title_only(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for authenticated access
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {} satisfies ICommunityPlatformMember.IJoin,
    });
  // 2. Establish community to post within
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Subscribe to community
  const subscription =
    await api.functional.communityPlatform.member.communities.subscriptions.create(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  // 4. Create baseline post for update testing
  const originalPost: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {},
    );
  // 5. Update the title of the existing post
  const updatedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: originalPost.id,
        body: {
          title: `Updated: ${originalPost.title}`,
          content_type: originalPost.content_type,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 6. Validate the update
  TestValidator.equals(
    "title matches update",
    updatedPost.title,
    `Updated: ${originalPost.title}`,
  );
  TestValidator.equals(
    "content_type remains unchanged",
    updatedPost.content_type,
    originalPost.content_type,
  );
  TestValidator.predicate(
    "updated_at is different",
    updatedPost.updated_at !== originalPost.updated_at,
  );
}
