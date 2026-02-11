import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator account and use the returned connection for all subsequent operations
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // Update connection with authentication token from authorize function
  const moderatorLoggedInConnection: api.IConnection = {
    host: connection.host,
  };
  moderatorLoggedInConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  // Create a community
  const communityName = RandomGenerator.alphabets(8);
  // Create a post as the moderator (so moderator is the author)
  const post = await api.functional.redditCommunity.member.posts.create(
    moderatorLoggedInConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 7,
        }),
        communityName: communityName,
        textContent: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 2,
          sentenceMax: 5,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Delete the post
  const deletedPost =
    await api.functional.redditCommunity.communityModerator.posts.erase(
      moderatorLoggedInConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // Validate that the returned post object matches the original
  TestValidator.equals(
    "deleted post matches original",
    deletedPost.id,
    post.id,
  );
  TestValidator.equals(
    "deleted post title matches",
    deletedPost.title,
    post.title,
  );
  TestValidator.equals(
    "deleted post author matches",
    deletedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "deleted post community matches",
    deletedPost.community.name,
    post.community.name,
  );
  TestValidator.predicate(
    "post status should be active before deletion",
    () => deletedPost.status === "active",
  );
  TestValidator.predicate(
    "deleted_at should be null before deletion",
    () => deletedPost.deleted_at === null,
  );
}
