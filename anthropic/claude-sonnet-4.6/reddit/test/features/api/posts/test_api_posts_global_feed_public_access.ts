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

export async function test_api_posts_global_feed_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (use the member's authenticated connection)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required before creating posts)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const textPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost);
  // 5. Create a link post
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  // 6. Create an image post
  const imagePost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // 7. Test as unauthenticated guest (no Authorization header)
  const guestConnection: api.IConnection = { host: connection.host };
  // 8. Call the global feed endpoint without auth (empty request body)
  const feed = await api.functional.community.posts.index(guestConnection, {
    body: {} satisfies ICommunityPost.IRequest,
  });
  typia.assert(feed);
  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    feed.pagination.current >= 1,
  );
  TestValidator.predicate("pagination limit >= 0", feed.pagination.limit >= 0);
  TestValidator.predicate(
    "pagination records >= 3",
    feed.pagination.records >= 3,
  );
  TestValidator.predicate("pagination pages >= 1", feed.pagination.pages >= 1);
  // 10. Validate data array is present
  TestValidator.predicate("data array exists", Array.isArray(feed.data));
  // 11. Validate each post summary: preview shape must match post type (business logic)
  for (const post of feed.data) {
    if (post.type === "text") {
      TestValidator.equals(
        "text preview type matches",
        post.preview.type,
        "text",
      );
    } else if (post.type === "link") {
      TestValidator.equals(
        "link preview type matches",
        post.preview.type,
        "link",
      );
    } else if (post.type === "image") {
      TestValidator.equals(
        "image preview type matches",
        post.preview.type,
        "image",
      );
    }
  }
  // 12. Fetch community-scoped feed with 'new' sort to verify our posts appear and order
  const communityFeed = await api.functional.community.posts.index(
    guestConnection,
    {
      body: {
        communityId: community.id,
        sort: "new",
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(communityFeed);
  // Verify our 3 posts appear in the community-scoped feed
  TestValidator.predicate(
    "community feed has at least 3 posts",
    communityFeed.data.length >= 3,
  );
  // 13. Verify sort order - newest first (created_at DESC)
  if (communityFeed.data.length >= 2) {
    const timestamps = communityFeed.data.map((p) =>
      new Date(p.created_at).getTime(),
    );
    let sortedDesc = true;
    for (let i = 0; i < timestamps.length - 1; i++) {
      if ((timestamps[i] ?? 0) < (timestamps[i + 1] ?? 0)) {
        sortedDesc = false;
        break;
      }
    }
    TestValidator.predicate("posts sorted newest first", sortedDesc);
  }
  // 14. Verify our specific posts are in the community feed
  const postIds = communityFeed.data.map((p) => p.id);
  TestValidator.predicate("text post in feed", postIds.includes(textPost.id));
  TestValidator.predicate("link post in feed", postIds.includes(linkPost.id));
  TestValidator.predicate("image post in feed", postIds.includes(imagePost.id));
}
