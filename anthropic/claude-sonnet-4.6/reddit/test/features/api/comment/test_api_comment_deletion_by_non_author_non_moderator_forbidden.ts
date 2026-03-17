import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_deletion_by_non_author_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (community creator and comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Create a community as Member A (becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Subscribe Member A to the community (required to create posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Create a post in the community as Member A
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create a comment on the post as Member A (this is the target comment)
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: { postId: post.id },
    },
  );
  typia.assert(comment);
  // Step 6: Register Member B (ordinary member with no special role in the community)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Test Execution: Member B attempts to delete Member A's comment — should be 403 Forbidden
  await TestValidator.httpError(
    "non-author non-moderator cannot delete another member's comment",
    403,
    async () => {
      await api.functional.community.member.posts.comments.erase(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
