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

export async function test_api_comment_update_rejected_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (the comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member A creates a comment on that post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment = await generate_random_community_member_posts_comments_create(
    memberAConnection,
    {
      params: { postId: post.id },
      body: { content: originalContent },
    },
  );
  typia.assert(comment);
  // Confirm original content is set correctly
  TestValidator.equals(
    "original comment content",
    comment.content,
    originalContent,
  );
  // 6. Register Member B (a different member who is NOT the comment author)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 7. Member B attempts to update Member A's comment — should be rejected (403)
  const newContent = RandomGenerator.paragraph({ sentences: 3 });
  await TestValidator.error("non-author cannot update comment", async () => {
    await api.functional.community.member.posts.comments.update(
      memberBConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: newContent,
        } satisfies ICommunityComment.IUpdate,
      },
    );
  });
}
