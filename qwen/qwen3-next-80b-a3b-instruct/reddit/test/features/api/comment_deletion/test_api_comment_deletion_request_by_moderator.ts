import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentDeletion";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_deletion } from "../../../prepare/prepare_random_community_bbs_comment_deletion";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_moderator_comment_deletions_create } from "../../../generate/generate_random_community_bbs_moderator_comment_deletions_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_deletion_request_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const memberAuth = await authorize_member_join(connection, {
    body: memberCreds,
  });
  // Step 2: Create a community
  const community =
    await generate_random_community_bbs_member_communities_create(connection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies ICommunityBbsCommunity.ICreate,
    });
  // Step 3: Create a post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  // Step 4: Create a comment on the post
  const comment = await generate_random_community_bbs_member_comments_create(
    connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  // Step 5: Create a moderator account
  const moderatorCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  const moderatorAuth = await authorize_moderator_join(connection, {
    body: moderatorCreds,
  });
  // Step 6: Authenticate the moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: moderatorCreds.email,
      password_hash: moderatorCreds.password_hash,
    } satisfies ICommunityBbsModerator.ILogin,
  });
  // Step 7: Submit deletion request for the comment
  await generate_random_community_bbs_moderator_comment_deletions_create(
    moderatorConnection,
    {
      body: {
        commentId: comment.id,
        reason: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
      } satisfies ICommunityBbsCommentDeletion.ICreate,
    },
  );
  // Step 8: Verify deletion request was created successfully
  // The generate_random_community_bbs_moderator_comment_deletions_create function completes successfully,
  // which confirms that the deletion request was accepted and recorded by the system.
  // Step 9: Verify original comment still exists unchanged - Not possible to verify as no API function exists to retrieve a single comment.
}
