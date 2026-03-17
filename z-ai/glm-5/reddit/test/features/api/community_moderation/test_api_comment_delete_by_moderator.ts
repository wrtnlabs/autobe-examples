import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_moderators_create } from "../../../generate/generate_random_community_platform_member_communities_moderators_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_moderator } from "../../../prepare/prepare_random_community_platform_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_delete_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a community (member A becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  // 3. Register member B (comment author)
  const authorConnection: api.IConnection = { host: connection.host };
  const author = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Owner creates a post in the community (owner is automatically subscribed)
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      ownerConnection,
      {
        params: { communityId: community.id },
      },
    );
  // 5. Member B creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
      },
    );
  // 6. Register member C (will be the moderator)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 7. Owner appoints member C as moderator
  const moderatorRole =
    await generate_random_community_platform_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { memberId: moderatorMember.id },
      },
    );
  typia.assert(moderatorRole);
  TestValidator.equals(
    "moderator role is 'moderator'",
    moderatorRole.role,
    "moderator",
  );
  // 8. Moderator deletes the comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 9. Verify comment is deleted by expecting error when trying to access it
  await TestValidator.error("comment should no longer exist", async () => {
    // Attempting to perform operations on deleted comment should fail
    await api.functional.communityPlatform.member.posts.comments.erase(
      authorConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
  });
}
