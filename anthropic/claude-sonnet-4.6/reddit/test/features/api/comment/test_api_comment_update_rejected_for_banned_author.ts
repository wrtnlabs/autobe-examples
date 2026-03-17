import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
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
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_update_rejected_for_banned_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  // 2. Member A creates a community (automatically becomes owner)
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Register Member B (the commenter who will be banned)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  // 4. Member B subscribes to the community
  const memberBSubscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: community.id },
    );
  typia.assert(memberBSubscription);
  // 5. Member A subscribes to the community (required to post)
  const memberASubscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: community.id },
    );
  typia.assert(memberASubscription);
  // 6. Member A creates a text post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 7. Member B creates a comment on Member A's post
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment = await generate_random_community_member_posts_comments_create(
    memberBConnection,
    {
      params: { postId: post.id },
      body: { content: originalContent },
    },
  );
  typia.assert(comment);
  // 8. Member A (community owner) bans Member B
  const ban = await generate_random_community_member_communities_bans_create(
    memberAConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: memberB.id,
        reason: "Violation of community rules",
      },
    },
  );
  typia.assert(ban);
  // Test: Member B (now banned) attempts to edit their own comment
  // Expected: HTTP 403 Forbidden
  await TestValidator.httpError(
    "banned member cannot edit their own comment",
    403,
    async () => {
      await api.functional.community.member.posts.comments.update(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
          body: {
            content: "Updated content by banned member",
          } satisfies ICommunityComment.IUpdate,
        },
      );
    },
  );
}
