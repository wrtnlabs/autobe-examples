import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_profile_posts_list_filtered_by_keyword_and_type(
  connection: api.IConnection,
): Promise<void> {
  // ─── 1. Register a new member ───────────────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // ─── 2. Create a community ──────────────────────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // ─── 3. Subscribe to the community ─────────────────────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ─── 4. Create 4 posts with different types and titles ─────────────────────
  // Text post 1: matches keyword "TypeScript"
  const textPost1 =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Introduction to TypeScript",
          type: "text",
          body: "TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost1);
  // Text post 2: matches keyword "TypeScript"
  const textPost2 =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Advanced TypeScript Tips",
          type: "text",
          body: "Learn advanced TypeScript patterns like conditional types, mapped types, and more.",
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost2);
  // Link post: does NOT match "TypeScript" keyword in title
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "Useful Resources",
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  // Image post: does NOT match "TypeScript" keyword in title
  const imagePost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: "My Gallery",
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // ─── 5. Get userProfileId: use member.id as proxy ───────────────────────────
  // Note: The IAuthorized response does not expose user_profile_id directly.
  // The user profile is created atomically during registration with a separate UUID.
  // Since no API exposes the profile ID, we use the member's ID as the userProfileId.
  // In a production scenario, the registration response should expose the profile ID.
  const userProfileId = member.id;
  // ─── 6. Test 1: Filter by keyword="TypeScript" and type="text" ──────────────
  const filteredResult =
    await api.functional.community.userProfiles.posts.index(memberConnection, {
      userProfileId,
      body: {
        keyword: "TypeScript",
        type: "text",
        limit: 10,
        page: 1,
      } satisfies ICommunityPost.IRequest,
    });
  typia.assert(filteredResult);
  // Validate pagination metadata
  TestValidator.equals("records count", filteredResult.pagination.records, 2);
  TestValidator.equals("pages count", filteredResult.pagination.pages, 1);
  TestValidator.equals("current page", filteredResult.pagination.current, 1);
  TestValidator.equals("page limit", filteredResult.pagination.limit, 10);
  // Validate data array length
  TestValidator.equals("data length", filteredResult.data.length, 2);
  // Validate all returned items are text type and contain "TypeScript" in title
  for (const post of filteredResult.data) {
    TestValidator.equals("post type is text", post.type, "text");
    TestValidator.predicate(
      "post title contains TypeScript",
      post.title.includes("TypeScript"),
    );
    // Validate preview shape is ITextPreview
    TestValidator.equals("preview type is text", post.preview.type, "text");
  }
  // ─── 7. Test 2: Sort by "top" with timeRange="this_week" ────────────────────
  const topResult = await api.functional.community.userProfiles.posts.index(
    memberConnection,
    {
      userProfileId,
      body: {
        sort: "top",
        timeRange: "this_week",
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(topResult);
  // Validate pagination structure is correct
  TestValidator.predicate(
    "top result has non-negative records",
    topResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "top result has non-negative pages",
    topResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "top result data is array",
    Array.isArray(topResult.data),
  );
  // All 4 posts should be returned (no type or keyword filter)
  TestValidator.equals("all posts returned", topResult.pagination.records, 4);
}
