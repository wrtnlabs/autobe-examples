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
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_moderator_comments_create } from "../../../generate/generate_random_community_bbs_moderator_comments_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_comment_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create actor-specific connections for moderator and member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 2: Register and authenticate the member
  const memberAuth: ICommunityBbsMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    });
  typia.assert(memberAuth);
  // Step 3: Register and authenticate the moderator
  const moderatorAuth: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderatorAuth);
  // Step 4: Authenticate the member for subsequent operations
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: memberAuth.token.access.substring(0, 8) + "...", // Use partial access token for login
    } satisfies ICommunityBbsMember.ILogin,
  });
  // Step 5: Authenticate the moderator for subsequent operations
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorAuth.email,
      password_hash: moderatorAuth.token.access.substring(0, 8) + "...", // Use partial access token for login
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Step 6: Member creates a community
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 10,
          }),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 7: Member creates a post in the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 8: Moderator creates a comment on the post
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_moderator_comments_create(
      moderatorConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 9: Validate the comment structure and relationships
  TestValidator.equals(
    "comment author ID matches moderator ID",
    comment.author.id,
    moderatorAuth.user_id,
  );
  TestValidator.equals(
    "comment post ID matches post ID",
    comment.post.id,
    post.id,
  );
  TestValidator.predicate(
    "comment has valid content",
    comment.content.length >= 1 && comment.content.length <= 10000,
  );
  TestValidator.equals("comment status is active", comment.status, "active");
  TestValidator.predicate(
    "comment has valid UUID format",
    /^[0-9a-f-]{36}$/.test(comment.id),
  );
  typia.assert(comment.author);
  typia.assert(comment.post);
}
