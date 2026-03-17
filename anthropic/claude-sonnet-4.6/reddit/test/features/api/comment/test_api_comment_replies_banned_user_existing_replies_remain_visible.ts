import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
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

export async function test_api_comment_replies_banned_user_existing_replies_remain_visible(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates a community
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Member A subscribes to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // Step 4: Member A creates a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberAConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Member A creates a top-level comment on the post
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: { parent_id: null },
      },
    );
  typia.assert(topLevelComment);
  // Step 6: Register Member B (second member)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBInfo = await authorize_member_join(memberBConnection, {});
  // Step 7: Member B creates a reply to the top-level comment (pre-ban content)
  const replyContent = RandomGenerator.paragraph({ sentences: 2 });
  const memberBReply =
    await generate_random_community_member_posts_comments_create(
      memberBConnection,
      {
        params: { postId: post.id },
        body: {
          content: replyContent,
          parent_id: topLevelComment.id,
        },
      },
    );
  typia.assert(memberBReply);
  // Step 8: Member A issues a ban against Member B
  const ban = await generate_random_community_member_communities_bans_create(
    memberAConnection,
    {
      params: { communityId: community.id },
      body: {
        banned_member_id: memberBInfo.id,
        reason: "Test ban to verify existing replies remain visible",
      },
    },
  );
  typia.assert(ban);
  // Test execution: Retrieve replies under the top-level comment
  const repliesPage =
    await api.functional.community.member.posts.comments.replies.index(
      memberAConnection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(repliesPage);
  // Validation: Member B's reply must still be present despite the ban
  TestValidator.predicate(
    "banned member's pre-ban reply is still visible in reply listing",
    repliesPage.data.some((reply) => reply.id === memberBReply.id),
  );
  // Validation: pagination records includes Member B's reply
  TestValidator.predicate(
    "records count includes banned member's reply",
    repliesPage.pagination.records >= 1,
  );
  // Validation: pages count is accurate
  TestValidator.predicate(
    "pages count is at least 1",
    repliesPage.pagination.pages >= 1,
  );
  // Validation: Member B's reply content is unchanged
  const foundReply = repliesPage.data.find(
    (reply) => reply.id === memberBReply.id,
  );
  TestValidator.predicate(
    "banned member's reply content is unchanged",
    foundReply !== undefined && foundReply.content === memberBReply.content,
  );
  // Validation: author info is populated correctly
  TestValidator.predicate(
    "banned member's reply has author info populated",
    foundReply !== undefined &&
      foundReply.author !== undefined &&
      foundReply.author.id === memberBInfo.id,
  );
}
