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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_post_update_link_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  TestValidator.equals("subscription active", subscription.active, true);
  // 4. Create initial link post
  const initialUrl = typia.random<
    string & tags.Format<"url"> & tags.MaxLength<80000>
  >();
  const initialTitle = RandomGenerator.paragraph();
  const initialPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: initialTitle,
          community_name: community.name,
          content_type: "LINK" as const,
          content_link: {
            url: initialUrl,
          } satisfies ICommunityPlatformPostLink.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(initialPost);
  TestValidator.equals("content type", initialPost.content_type, "LINK");
  // Extract initial link content for later comparison
  const initialLinkContent = initialPost.content as ICommunityPlatformPostLink;
  typia.assert(initialLinkContent);
  // 5. Update post with new title and URL
  const newUrl = typia.random<
    string & tags.Format<"url"> & tags.MaxLength<80000>
  >();
  const newTitle = RandomGenerator.paragraph();
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: initialPost.id,
        body: {
          title: newTitle,
          linkContent: {
            url: newUrl,
          } satisfies ICommunityPlatformPostLink.IUpdate,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  // 6. Validate updates
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals(
    "content type unchanged",
    updatedPost.content_type,
    "LINK",
  );
  TestValidator.notEquals(
    "updated_at changed",
    initialPost.updated_at,
    updatedPost.updated_at,
  );
  // Validate link content
  const updatedLinkContent = updatedPost.content as ICommunityPlatformPostLink;
  typia.assert(updatedLinkContent);
  TestValidator.equals("URL updated", updatedLinkContent.url, newUrl);
  TestValidator.notEquals(
    "URL changed",
    updatedLinkContent.url,
    initialLinkContent.url,
  );
  // Domain extraction validation
  TestValidator.predicate(
    "domain extracted",
    updatedLinkContent.domain.length > 0,
  );
}
