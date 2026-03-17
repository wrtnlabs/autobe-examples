import api from "@ORGANIZATION/PROJECT-api";
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

export async function test_api_post_retrieval_link_post_type(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random valid UUID for testing
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 1. Retrieve the post details using the postId
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    connection,
    {
      postId,
    },
  );
  typia.assert(retrievedPost);
  // 2. Validate standard fields exist and have correct types
  TestValidator.equals("post_type is link", retrievedPost.post_type, "link");
  TestValidator.equals(
    "deleted_at is null for active post",
    retrievedPost.deleted_at,
    null,
  );
  // 3. Verify author object contains username
  TestValidator.equals(
    "author has username",
    retrievedPost.author.username !== undefined,
    true,
  );
  // 4. Verify community object contains name
  TestValidator.equals(
    "community has name",
    retrievedPost.community.name !== undefined,
    true,
  );
  // 5. Verify content object for link post
  const content = retrievedPost.content;
  TestValidator.equals("content post_type is link", content.post_type, "link");
  // 6. Validate link-specific fields are present
  // Use type assertion after checking post_type discriminator
  const linkContent = typia.assert(content) as IRedditCommunityPost.IContent & {
    post_type: "link";
  };
  TestValidator.equals(
    "url is valid URI format",
    linkContent.url !== undefined,
    true,
  );
  TestValidator.equals(
    "domain_name exists",
    linkContent.domain_name !== undefined,
    true,
  );
}
