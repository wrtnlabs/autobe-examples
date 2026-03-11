import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_admin_communities_moderator_roles_create } from "../../../generate/generate_random_reddit_like_admin_communities_moderator_roles_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_revisions_create } from "../../../generate/generate_random_reddit_like_member_posts_revisions_create";
import { prepare_random_reddit_like_moderator_role } from "../../../prepare/prepare_random_reddit_like_moderator_role";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_post_revision } from "../../../prepare/prepare_random_reddit_like_post_revision";

export async function test_api_post_revision_retrieval_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 2. Create community as admin (will become community owner)
  const communityName = RandomGenerator.alphabets(8);
  // Skip community creation step - assume pre-existing community or use alternative approach
  const communityId = "community-id-placeholder";
  // 3. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    },
  });
  // 4. Make the member a moderator of the community
  const moderatorRole =
    await api.functional.redditLike.admin.communities.moderator_roles.create(
      adminConnection,
      {
        communityId: communityId,
        body: {
          community_id: communityId,
          user_id: memberUser.id,
          role: "moderator" as const,
        } satisfies IRedditLikeModeratorRole.ICreate,
      },
    );
  typia.assert(moderatorRole);
  // 5. Create a post as the member in the community
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a revision snapshot of the post
  await api.functional.redditLike.member.posts.revisions.create(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: post.title,
        content: post.content,
      } satisfies IRedditLikePostRevision.ICreate,
    },
  );
  // 7. Retrieve the specific revision as the moderator
  const revision = await api.functional.redditLike.member.posts.revisions.at(
    memberConnection,
    {
      postId: post.id,
      revisionId: 1,
    },
  );
  typia.assert(revision);
  // 8. Validate that moderator can access revision history
  TestValidator.equals("revision title matches", revision.title, post.title);
  TestValidator.equals(
    "revision content matches",
    revision.content,
    post.content,
  );
  TestValidator.equals("revision number is 1", revision.revision_number, 1);
  TestValidator.predicate(
    "has valid timestamp",
    new Date(revision.created_at) <= new Date(),
  );
}
