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
export async function test_api_comment_update_with_valid_content(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string & tags.MinLength<8> & tags.MaxLength<128>
      >(),
    },
  });
  typia.assert(member);
  // Step 2: Create community for the post
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 4: Create comment on the post
  const comment = await generate_random_community_bbs_member_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(comment);
  // Step 5: Create 10,000-character Markdown content for update
  const markdownContent = RandomGenerator.content({
    paragraphs: 20,
    sentenceMin: 12,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });
  // Step 6: Update the comment with valid content
  const updated = await api.functional.communityBbs.member.comments.update(
    memberConnection,
    {
      commentId: comment.id,
      body: {
        content: markdownContent,
      },
    },
  );
  typia.assert(updated);
  // Step 7: Validate update results
  // Check that content was updated to exactly what was sent
  TestValidator.equals(
    "updated content matches",
    updated.content,
    markdownContent,
  );
  // Check that status remained unchanged
  TestValidator.equals(
    "comment status unchanged",
    updated.status,
    comment.status,
  );
  // Check that post_id remained unchanged
  TestValidator.equals("post_id unchanged", updated.post.id, post.id);
  // Check that author_id remained unchanged
  TestValidator.equals("author_id unchanged", updated.author.id, member.id);
}
