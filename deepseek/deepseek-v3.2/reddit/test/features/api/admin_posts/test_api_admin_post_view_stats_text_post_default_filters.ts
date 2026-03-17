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
import type { ICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostViewStat";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostViewStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
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

export async function test_api_admin_post_view_stats_text_post_default_filters(
  connection: api.IConnection,
): Promise<void> {
  // Test that an admin can retrieve view statistics for a text post with default pagination and filters.
  // Create a text post through proper authorization chain, then authenticate as admin and retrieve its view statistics.
  // Verify the response includes paginated view stats records with expected fields: id, actorType, viewCount, uniqueViewerCount, createdAt, and post summary.
  // Ensure the admin authorization is validated and the post exists before retrieving statistics.
  // Test that even with no views recorded, the endpoint returns empty paginated results with proper structure.
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.alphaNumeric(12),
    nickname: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: memberJoinBody,
  });
  typia.assert(memberAuth);
  // 3. Create community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      { body: communityBody },
    );
  typia.assert(community);
  // 4. Subscribe member to community
  const subscriptionBody = {
    community_id: community.id,
    active: true,
  } satisfies ICommunityPlatformSubscription.ICreate;
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      { body: subscriptionBody },
    );
  typia.assert(subscription);
  // 5. Create text post
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    community_name: community.name,
    content_type: "TEXT" as const,
    content_text: {
      content: RandomGenerator.paragraph({ sentences: 5 }),
      formatting: "plain",
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    { body: postBody },
  );
  typia.assert(post);
  // 6. Admin retrieves view statistics with default filters (empty request body)
  const statsRequest = {} satisfies ICommunityPlatformPostViewStat.IRequest;
  const viewStats =
    await api.functional.communityPlatform.admin.posts.view_stats.index(
      adminConnection,
      {
        postId: post.id,
        body: statsRequest,
      },
    );
  typia.assert(viewStats);
  // 7. Validate paginated response structure
  TestValidator.equals(
    "pagination properties exist",
    Object.keys(viewStats.pagination),
    ["current", "limit", "records", "pages"],
  );
  TestValidator.predicate(
    "current page is 1",
    () => viewStats.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    () => viewStats.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    () => viewStats.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    () => viewStats.pagination.pages >= 0,
  );
  // 8. Validate data array structure (even if empty)
  for (const stat of viewStats.data) {
    typia.assert(stat);
    TestValidator.predicate("has id field", () => stat.id !== undefined);
    TestValidator.predicate(
      "has actorType field",
      () => stat.actorType !== undefined,
    );
    TestValidator.predicate(
      "has viewCount field",
      () => stat.viewCount !== undefined,
    );
    TestValidator.predicate(
      "has uniqueViewerCount field",
      () => stat.uniqueViewerCount !== undefined,
    );
    TestValidator.predicate(
      "has createdAt field",
      () => stat.createdAt !== undefined,
    );
    TestValidator.predicate("has post field", () => stat.post !== undefined);
    // Validate post summary structure
    TestValidator.equals("post id matches", stat.post.id, post.id);
    TestValidator.equals("post title matches", stat.post.title, post.title);
    TestValidator.predicate(
      "post has author",
      () => stat.post.author !== undefined,
    );
    TestValidator.predicate(
      "post has community",
      () => stat.post.community !== undefined,
    );
  }
  // 9. Additional validation for empty results (no views recorded yet)
  TestValidator.predicate("data is array (can be empty)", () =>
    Array.isArray(viewStats.data),
  );
}
