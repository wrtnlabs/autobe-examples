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
export async function test_api_comment_creation_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a community for hosting the post
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 3: Create a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 4: Create a comment on the post using the authenticated member's connection
  const comment: ICommunityBbsComment =
    await api.functional.communityBbs.member.comments.create(memberConnection, {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      } satisfies ICommunityBbsComment.ICreate,
    });
  typia.assert(comment);
  // Step 5: Validate the comment was created correctly
  // Verify the comment references the correct post
  TestValidator.equals(
    "comment post_id matches post id",
    comment.post.id,
    post.id,
  );
  // Verify the comment status is 'active' by default
  TestValidator.equals("comment status is active", comment.status, "active");
  // Verify the author summary contains correct information
  TestValidator.equals(
    "comment author id matches member id",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "comment author name matches member display name",
    comment.author.name,
    member.display_name,
  );
  TestValidator.predicate(
    "comment author reputation is non-negative",
    comment.author.reputation >= 0,
  );
}
