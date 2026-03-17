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

export async function test_api_post_link_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for member
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Member setup via authorize_member_join utility
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member);
  // 2. Create community using generate_random_community_platform_member_communities_create utility
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community using generate_random_community_platform_member_subscriptions_create utility
  const subscription: ICommunityPlatformSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.predicate("subscription is active", subscription.active);
  // 4. Create LINK-type post without link metadata using generate_random_community_platform_member_posts_create utility
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          content_type: "LINK",
          // No content_link provided - this is intentional to test link metadata creation separately
        },
      },
    );
  typia.assert(post);
  TestValidator.equals("post content_type is LINK", post.content_type, "LINK");
  // 5. Create link metadata for the post using generate_random_community_platform_member_posts_links_create utility
  const testUrl = "https://github.com/user/repo" satisfies string &
    tags.Format<"url">;
  const link: ICommunityPlatformPostLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          url: testUrl,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          thumbnail_url: "https://example.com/image.jpg" satisfies
            | (string & tags.MaxLength<80000> & tags.Format<"url">)
            | null
            | undefined,
        },
      },
    );
  typia.assert(link);
  // 6. Validate link metadata properties
  TestValidator.equals("URL matches input", link.url, testUrl);
  TestValidator.equals("domain extracted correctly", link.domain, "github.com");
  TestValidator.predicate("has id", link.id.length > 0);
  TestValidator.predicate(
    "has created_at timestamp",
    link.created_at.length > 0,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    link.updated_at.length > 0,
  );
  TestValidator.equals("deleted_at is null (active)", link.deleted_at, null);
  // 7. Validate post association
  typia.assert(link.post);
  TestValidator.equals("post ID matches", link.post.id, post.id);
  TestValidator.equals("post title matches", link.post.title, post.title);
  // 8. Validate domain extraction for feed display
  TestValidator.predicate(
    "domain is extracted for feed display",
    link.domain === "github.com",
  );
  // Additional validation for link metadata completeness
  TestValidator.predicate(
    "link has required title",
    link.title !== null && link.title !== undefined && link.title.length > 0,
  );
  TestValidator.predicate(
    "link has required description",
    link.description !== null &&
      link.description !== undefined &&
      link.description.length > 0,
  );
  // Validate the link content type matches post content_type
  TestValidator.predicate(
    "post content_type remains LINK after link creation",
    post.content_type === "LINK",
  );
}
