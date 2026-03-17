import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test successful retrieval of link metadata for a link post.
 *
 * 1. Create member account via join endpoint
 * 2. Create community
 * 3. Subscribe to community
 * 4. Create LINK-type post
 * 5. Attach link metadata to post
 * 6. Retrieve link metadata via GET endpoint
 * 7. Validate response contains all expected fields and relationships
 */
export async function test_api_link_post_metadata_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorizedMember);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create LINK-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "LINK",
        // content_link will be created separately
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "post content_type should be LINK",
    post.content_type,
    "LINK",
  );
  // 5. Create link metadata for the post
  const linkCreate = {
    url: "https://example.com/blog/article-123" satisfies string &
      tags.MaxLength<80000> &
      tags.Format<"uri">,
    title: "Example Blog Post",
    description: "An interesting article about testing",
    thumbnail_url: "https://example.com/images/thumbnail.jpg" satisfies
      | (string & tags.MaxLength<80000> & tags.Format<"uri">)
      | null
      | undefined,
  } satisfies ICommunityPlatformPostLink.ICreate;
  const createdLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        body: linkCreate,
        params: { postId: post.id },
      },
    );
  typia.assert(createdLink);
  // 6. Retrieve link metadata via GET endpoint
  const retrievedLink = await api.functional.communityPlatform.posts.links.at(
    memberConnection,
    {
      postId: post.id,
      linkId: createdLink.id,
    },
  );
  typia.assert(retrievedLink);
  // 7. Validate all expected fields
  TestValidator.equals("link ID matches", retrievedLink.id, createdLink.id);
  TestValidator.equals("URL matches", retrievedLink.url, linkCreate.url);
  // Extract domain from URL for validation
  const url = new URL(linkCreate.url);
  const expectedDomain = url.hostname;
  TestValidator.equals(
    "domain extracted correctly",
    retrievedLink.domain,
    expectedDomain,
  );
  TestValidator.equals("title matches", retrievedLink.title, linkCreate.title);
  TestValidator.equals(
    "description matches",
    retrievedLink.description,
    linkCreate.description,
  );
  TestValidator.equals(
    "thumbnail_url matches",
    retrievedLink.thumbnail_url,
    linkCreate.thumbnail_url,
  );
  TestValidator.predicate(
    "created_at exists",
    retrievedLink.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    retrievedLink.updated_at !== null,
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedLink.deleted_at,
    null,
  );
  // 8. Validate post relationship
  typia.assert(retrievedLink.post);
  TestValidator.equals("post ID matches", retrievedLink.post.id, post.id);
  TestValidator.equals(
    "post title matches",
    retrievedLink.post.title,
    post.title,
  );
  typia.assert(retrievedLink.post.author);
  TestValidator.equals(
    "author ID matches",
    retrievedLink.post.author.id,
    authorizedMember.id,
  );
  typia.assert(retrievedLink.post.community);
  TestValidator.equals(
    "community ID matches",
    retrievedLink.post.community.id,
    community.id,
  );
  // 9. Validate both post and link are active
  TestValidator.equals("post deleted_at should be null", post.deleted_at, null);
  TestValidator.equals(
    "link deleted_at should be null",
    retrievedLink.deleted_at,
    null,
  );
}
