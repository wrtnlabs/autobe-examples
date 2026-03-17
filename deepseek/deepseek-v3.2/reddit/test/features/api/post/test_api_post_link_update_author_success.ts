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

export async function test_api_post_link_update_author_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Subscribe to community (required for posting)
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
  // Create LINK-type post
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: community.name,
        content_type: "LINK",
        content_link: {
          url: typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          thumbnail_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post content type", post.content_type, "LINK");
  // Get initial link metadata from post content
  const initialLink = post.content as ICommunityPlatformPostLink;
  typia.assert(initialLink);
  // Prepare updated link data
  const updateUrl = typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>();
  const updateBody = {
    url: updateUrl,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    thumbnail_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
  } satisfies ICommunityPlatformPostLink.IUpdate;
  // Update the link metadata
  const updatedLink =
    await api.functional.communityPlatform.member.posts.links.update(
      memberConnection,
      {
        postId: post.id,
        linkId: initialLink.id,
        body: updateBody,
      },
    );
  typia.assert(updatedLink);
  // Validate business logic
  TestValidator.equals("link id unchanged", updatedLink.id, initialLink.id);
  TestValidator.equals("post relation unchanged", updatedLink.post.id, post.id);
  TestValidator.equals("url updated", updatedLink.url, (updateBody.url satisfies string as string));
  TestValidator.equals("title updated", updatedLink.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updatedLink.description,
    updateBody.description,
  );
  TestValidator.equals(
    "thumbnail_url updated",
    updatedLink.thumbnail_url,
    (updateBody.thumbnail_url satisfies string as string),
  );
  TestValidator.predicate("domain extracted", () => {
    return (
      updatedLink.domain.length > 0 && updatedLink.domain !== initialLink.domain
    );
  });
  // Verify author remains the same (using post from creation)
  TestValidator.equals("author unchanged", post.author.id, member.id);
  // Test optional fields can be cleared to null
  const clearBody = {
    title: null,
    description: null,
    thumbnail_url: null,
  } satisfies ICommunityPlatformPostLink.IUpdate;
  const clearedLink =
    await api.functional.communityPlatform.member.posts.links.update(
      memberConnection,
      {
        postId: post.id,
        linkId: initialLink.id,
        body: clearBody,
      },
    );
  typia.assert(clearedLink);
  TestValidator.equals("title cleared to null", clearedLink.title, null);
  TestValidator.equals(
    "description cleared to null",
    clearedLink.description,
    null,
  );
  TestValidator.equals(
    "thumbnail_url cleared to null",
    clearedLink.thumbnail_url,
    null,
  );
  TestValidator.predicate(
    "url unchanged after clear",
    () => clearedLink.url === updatedLink.url,
  );
  TestValidator.predicate(
    "domain unchanged after clear",
    () => clearedLink.domain === updatedLink.domain,
  );
}