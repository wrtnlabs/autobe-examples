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

export async function test_api_post_at_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member to create post
  const memberConnection: api.IConnection = { host: connection.host };
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberCredentials });
  // 2. Create a text post in a public community
  const postTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const communityName = RandomGenerator.alphabets(8);
  const createdPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: postTitle,
          communityName: communityName,
          textContent: postContent,
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
  typia.assert(createdPost);
  // 3. Access post as unauthenticated guest (no authorization headers)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    guestConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // 4. Validate public access response fields
  TestValidator.equals("post title matches", retrievedPost.title, postTitle);
  TestValidator.equals(
    "post content type is text",
    typeof retrievedPost.content,
    "string",
  );
  TestValidator.equals(
    "post content matches",
    retrievedPost.content as string,
    postContent,
  );
  TestValidator.equals("post status is active", retrievedPost.status, "active");
  TestValidator.equals(
    "post comment count is 0",
    retrievedPost.comments_count,
    0,
  );
  TestValidator.equals("post vote score is 0", retrievedPost.vote_score, 0);
  TestValidator.predicate(
    "post created_at is valid date-time",
    (() => {
      try {
        new Date(retrievedPost.created_at);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.predicate(
    "post updated_at is valid date-time",
    (() => {
      try {
        new Date(retrievedPost.updated_at);
        return true;
      } catch {
        return false;
      }
    })(),
  );
  TestValidator.equals(
    "post author id exists",
    Boolean(retrievedPost.author.id),
    true,
  );
  TestValidator.equals(
    "post author display name exists",
    Boolean(retrievedPost.author.display_name),
    true,
  );
  TestValidator.equals(
    "post community name matches",
    retrievedPost.community.name,
    communityName,
  );
  TestValidator.predicate(
    "post karma score is non-negative",
    retrievedPost.karma_score >= 0,
  );
  TestValidator.equals(
    "post deleted_at is null",
    retrievedPost.deleted_at,
    null,
  );
}
