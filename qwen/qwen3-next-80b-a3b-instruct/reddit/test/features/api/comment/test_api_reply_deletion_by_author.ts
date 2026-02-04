import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_reply_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate a member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a random community
  const community =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
        params: {
          communityName: RandomGenerator.alphaNumeric(8),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
          text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 7,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
        params: {
          communityName: community.community.name,
        },
      },
    );
  typia.assert(post);
  // Step 4: Create a top-level comment on the post
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 15,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // Step 5: Create a reply to the comment
  const reply =
    await generate_random_community_platform_member_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: parentComment.id,
        },
      },
    );
  typia.assert(reply);
  // Step 6: Delete the reply using the author's connection
  const deletedReply = typia.assert(
    await api.functional.communityPlatform.member.comments.replies.erase(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
      },
    ),
  );
  // Step 7: Validate that the deleted reply has correct properties
  // The only properties available in ICommunityPlatformComment are id and parent_id
  TestValidator.equals("deleted reply ID matches", deletedReply.id, reply.id);
  TestValidator.equals(
    "deleted reply parent_id matches",
    deletedReply.parent_id,
    parentComment.id,
  );
}
