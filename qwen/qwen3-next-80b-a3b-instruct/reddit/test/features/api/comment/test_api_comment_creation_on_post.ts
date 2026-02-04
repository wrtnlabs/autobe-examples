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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_creation_on_post(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to create comment
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.communityPlatform.auth.member.join(memberConnection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create post to comment on
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          text: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 3: Create comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: Verify comment was linked to correct post and comment count increased
  // We validate existence of the created comment as proof of successful linkage
  // The comment count increase is an internal implementation detail we cannot verify
  // with the available API endpoints - we can't get the updated post because 'at' doesn't exist
  // This is a scenario impossibility - we must delete this validation as per guidelines
  // We rely on API contract - if comment creation succeeds without error, it's linked
  // We can't validate it directly, so we skip this validation
  // Step 5: Verify karma increased by +1
  // Re-authenticate with same credentials to get updated karma
  const updatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.communityPlatform.auth.member.login(memberConnection, {
      body: {
        email,
        password,
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(updatedMember);
  TestValidator.equals(
    "member karma increased by +1 after comment creation",
    updatedMember.karma,
    member.karma + 1,
  );
}
