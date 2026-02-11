import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_forbidden_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // Step 2: Create community as owner
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create and authenticate first member (post author)
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Step 4: Subscribe author to community using the only available function (despite its misleading name)
  await api.functional.redditCommunity.member.communities.invalid(
    authorConnection,
    {
      id: community.id,
    },
  );
  // Step 5: Create post as author
  const post = await generate_random_reddit_community_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        textContent: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 6: Create and authenticate second member (non-owner, non-moderator)
  const nonOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // Step 7: Attempt to delete the post as non-owner - must fail with 403
  await TestValidator.httpError(
    "non-owner deletion attempt fails with 403",
    403,
    async () => {
      await api.functional.redditCommunity.member.posts.erase(
        nonOwnerConnection,
        {
          postId: post.id,
        },
      );
    },
  );
  // No further validation possible because GET /posts/{postId} endpoint is not provided in SDK.
}
