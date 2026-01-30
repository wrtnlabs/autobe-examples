import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_update_maintains_relationships(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member (single member for all operations)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.communityBbs.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create community to host the post (using memberConnection)
  const community = await api.functional.communityBbs.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(5),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityBbsCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Step 3: Create post to which comment will be attached (using memberConnection)
  const post = await api.functional.communityBbs.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(4),
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Create comment on the post (using memberConnection)
  const comment = await api.functional.communityBbs.member.comments.create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 5: Update comment content (using the same memberConnection that created the comment)
  const updatedComment =
    await api.functional.communityBbs.member.comments.update(memberConnection, {
      commentId: comment.id,
      body: {
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies ICommunityBbsComment.IUpdate,
    });
  typia.assert(updatedComment);
  // Step 6: Validate that relationships and metadata are preserved
  TestValidator.equals("comment_id unchanged", updatedComment.id, comment.id);
  TestValidator.equals(
    "post_id unchanged",
    updatedComment.post.id,
    comment.post.id,
  );
  TestValidator.equals(
    "author_id unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "status unchanged",
    updatedComment.status,
    comment.status,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    comment.created_at,
  );
}
