import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Setup: Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberJoin);
  // Create authenticated member connection for subsequent API calls
  const memberAuthConnection: api.IConnection = { host: connection.host };
  memberAuthConnection.headers = {
    ...connection.headers,
    Authorization: memberJoin.token.access,
  };
  // 2. Create a community first (for post creation)
  const communityCreateConnection: api.IConnection = { host: connection.host };
  communityCreateConnection.headers = {
    ...connection.headers,
    Authorization: memberJoin.token.access,
  };
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create initial post (text type)
  const postCreateConnection: api.IConnection = { host: connection.host };
  postCreateConnection.headers = {
    ...connection.headers,
    Authorization: memberJoin.token.access,
  };
  const initialPost =
    await generate_random_reddit_community_member_posts_create(
      postCreateConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          community_id: communityId,
          post_type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(initialPost);
  // Store original values for validation
  const originalTitle = initialPost.title;
  const originalBody =
    initialPost.content.post_type === "text"
      ? initialPost.content.body
      : undefined;
  const originalCreatedAt = initialPost.created_at;
  const originalVoteScore = initialPost.vote_score;
  const originalCommentCount = initialPost.comment_count;
  const originalAuthor = initialPost.author;
  const originalCommunity = initialPost.community;
  // 4. Update the post
  const updatedTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updateBody = {
    title: updatedTitle,
    text_post_body: updatedBody,
  } satisfies IRedditCommunityPost.IUpdate;
  const updatedPost = await api.functional.redditCommunity.member.posts.update(
    memberAuthConnection,
    {
      postId: initialPost.id,
      body: updateBody,
    },
  );
  typia.assert(updatedPost);
  // 5. Verify updates
  TestValidator.equals(
    "post title should be updated",
    updatedPost.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post body should be updated",
    updatedPost.content.post_type === "text" ? updatedPost.content.body : "",
    updatedBody,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    initialPost.updated_at,
    updatedPost.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be newer",
    () => new Date(updatedPost.updated_at) > new Date(originalCreatedAt),
  );
  // 6. Verify metadata remained intact
  TestValidator.equals(
    "author should remain the same",
    updatedPost.author.id,
    originalAuthor.id,
  );
  TestValidator.equals(
    "community should remain the same",
    updatedPost.community.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "vote_score should remain unchanged",
    updatedPost.vote_score,
    originalVoteScore,
  );
  TestValidator.equals(
    "comment_count should remain unchanged",
    updatedPost.comment_count,
    originalCommentCount,
  );
  TestValidator.equals(
    "created_at should remain the same",
    updatedPost.created_at,
    originalCreatedAt,
  );
}
