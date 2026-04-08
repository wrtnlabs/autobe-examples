import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test the primary success path for creating a text post.
 *
 * Validates the complete text post creation flow including member authentication, community setup, and post submission.
 * Ensures that the post is correctly stored with all required fields, the text content is persisted in the text post
 * table, and all computed fields are properly initialized.
 *
 * 1. Register a new member account with randomized credentials.
 * 2. Create a community that the member will post in.
 * 3. Create a text post with title and content in the community.
 * 4. Validate post response contains correct post_type, zero vote counts, valid timestamps,
 *    null deleted_at, correct community and author references, and stored text content.
 */
export async function test_api_post_creation_text_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const username = RandomGenerator.alphaNumeric(6);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      username,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community for posting
  const communityConnection: api.IConnection = { host: connection.host };
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  const community =
    await generate_random_reddit_platform_member_communities_create(
      communityConnection,
      {
        body: {
          name: communityName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create text post using the same connection that has auth headers from registration
  const textContentValue = RandomGenerator.content({ paragraphs: 3 });
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        text_content: textContentValue,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Validate post response
  TestValidator.equals("post_type is text", post.post_type, "text");
  TestValidator.equals("upvotes_count is 0", post.upvotes_count, 0);
  TestValidator.equals("downvotes_count is 0", post.downvotes_count, 0);
  TestValidator.equals("comment_count is 0", post.comment_count, 0);
  TestValidator.predicate("created_at is set", post.created_at !== undefined);
  TestValidator.predicate("updated_at is set", post.updated_at !== undefined);
  TestValidator.equals("deleted_at is null", post.deleted_at, null);
  TestValidator.equals("community matches", post.community.id, community.id);
  TestValidator.equals("author matches", post.author.id, memberAuth.id);
  typia.assert(post.textContent!);
  TestValidator.predicate("textContent is present", post.textContent !== null);
  TestValidator.equals(
    "textContent matches input",
    post.textContent!.text_content,
    textContentValue,
  );
}
