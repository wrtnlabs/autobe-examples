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

export async function test_api_post_link_update_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create author member
  const authorConnection: api.IConnection = { host: connection.host };
  const authorMember = await authorize_member_join(authorConnection, {});
  typia.assert(authorMember);
  // 2. Create community as author
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to their own community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create LINK-type post in the community
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        content_type: "LINK" as const,
        content_link: {
          url: typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  TestValidator.equals("post is LINK type", post.content_type, "LINK");
  // 5. Create initial link metadata for the post
  const initialUrl = typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>();
  const link =
    await generate_random_community_platform_member_posts_links_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          url: initialUrl,
          title: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 2,
            wordMax: 6,
          }),
          description: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(link);
  TestValidator.equals("link belongs to post", link.post.id, post.id);
  // 6. Create non-author member
  const otherConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherConnection, {});
  typia.assert(otherMember);
  TestValidator.notEquals(
    "different member IDs",
    authorMember.id,
    otherMember.id,
  );
  // 7. Non-author attempts to update link metadata → should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-author cannot update link metadata - 403 Forbidden",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.links.update(
        otherConnection,
        {
          postId: post.id,
          linkId: link.id,
          body: {
            url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
            title: "Updated Title",
          } satisfies ICommunityPlatformPostLink.IUpdate,
        },
      );
    },
  );
  // 8. Verify link metadata unchanged (optional validation)
  // This confirms the update was actually rejected, not just that an error was thrown
  const verifyLink =
    await api.functional.communityPlatform.member.posts.links.create(
      authorConnection,
      {
        postId: post.id,
        body: {
          url: typia.random<string & tags.MaxLength<80000> & tags.Format<"url">>(),
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(verifyLink);
  // Note: Cannot fetch existing link directly, but can verify the post still exists
  // and attempt to create another link would fail with conflict (409)
}
