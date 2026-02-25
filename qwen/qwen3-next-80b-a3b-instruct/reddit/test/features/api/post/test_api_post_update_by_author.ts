import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member (actor)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCommunityMember.IJoin;
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorizedMember);
  // 2. Simulate an existing post using typia.random (since create endpoint not available)
  // We use a real IRedditCommunityPost structure to guarantee type safety
  const existingPost = typia.random<IRedditCommunityPost>();
  typia.assert(existingPost);
  const postId = existingPost.id;
  // 3. Update the post with new title and content
  const updatedTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 8,
  });
  const updatedContent = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 3,
    sentenceMax: 7,
    wordMin: 3,
    wordMax: 8,
  });
  const updateResponse =
    await api.functional.redditCommunity.member.posts.update(memberConnection, {
      postId,
      body: {
        title: updatedTitle,
        content: updatedContent,
      } satisfies IRedditCommunityPost.IUpdate,
    });
  typia.assert(updateResponse);
  // 4. Validate the updated post
  // Verify the title and content were updated
  TestValidator.equals(
    "post title updated",
    updateResponse.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post content updated",
    updateResponse.content,
    updatedContent,
  );
  // Verify other fields remain unchanged (per requirements)
  TestValidator.equals("url preserved", updateResponse.url, existingPost.url);
  TestValidator.equals(
    "image_url preserved",
    updateResponse.image_url,
    existingPost.image_url,
  );
  // Verify vote_score and comment_count are preserved
  TestValidator.equals(
    "vote_score preserved",
    updateResponse.vote_score,
    existingPost.vote_score,
  );
  TestValidator.equals(
    "comment_count preserved",
    updateResponse.comment_count,
    existingPost.comment_count,
  );
  // Verify the updated_at is newer than created_at
  const createdAt = new Date(existingPost.created_at);
  const updatedAt = new Date(updateResponse.updated_at);
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedAt > createdAt,
  );
  // Verify author and community remain unchanged
  TestValidator.equals(
    "author id preserved",
    updateResponse.author.id,
    existingPost.author.id,
  );
  TestValidator.equals(
    "community id preserved",
    updateResponse.community.id,
    existingPost.community.id,
  );
}
