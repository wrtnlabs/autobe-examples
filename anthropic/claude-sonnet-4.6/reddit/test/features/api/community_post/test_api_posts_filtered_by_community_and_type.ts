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

export async function test_api_posts_filtered_by_community_and_type(
  connection: api.IConnection,
): Promise<void> {
  // ── 1. Member A setup ──────────────────────────────────────────────────────
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // ── 2. Create Community X ──────────────────────────────────────────────────
  const communityX = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(communityX);
  // ── 3. Subscribe Member A to Community X ──────────────────────────────────
  const subAX =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: communityX.id },
    );
  typia.assert(subAX);
  // ── 4. Create 2 text posts in Community X ─────────────────────────────────
  const textPost1 =
    await api.functional.community.member.communities.posts.create(
      memberAConnection,
      {
        communityId: communityX.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost1);
  const textPost2 =
    await api.functional.community.member.communities.posts.create(
      memberAConnection,
      {
        communityId: communityX.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost2);
  // ── 5. Create Community Y ──────────────────────────────────────────────────
  const communityY = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(communityY);
  // ── 6. Subscribe Member A to Community Y ──────────────────────────────────
  const subAY =
    await api.functional.community.member.communities.subscriptions.create(
      memberAConnection,
      { communityId: communityY.id },
    );
  typia.assert(subAY);
  // ── 7. Create 2 link posts in Community Y ─────────────────────────────────
  const linkPost1 =
    await api.functional.community.member.communities.posts.create(
      memberAConnection,
      {
        communityId: communityY.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost1);
  const linkPost2 =
    await api.functional.community.member.communities.posts.create(
      memberAConnection,
      {
        communityId: communityY.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost2);
  // ── 8. Member B setup ──────────────────────────────────────────────────────
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // ── 9. Subscribe Member B to Community X ──────────────────────────────────
  const subBX =
    await api.functional.community.member.communities.subscriptions.create(
      memberBConnection,
      { communityId: communityX.id },
    );
  typia.assert(subBX);
  // ── 10. Create 2 image posts in Community X ───────────────────────────────
  const imagePost1 =
    await api.functional.community.member.communities.posts.create(
      memberBConnection,
      {
        communityId: communityX.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost1);
  const imagePost2 =
    await api.functional.community.member.communities.posts.create(
      memberBConnection,
      {
        communityId: communityX.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost2);
  // ── Scenario A: Filter by communityId only ────────────────────────────────
  const guestConnection: api.IConnection = { host: connection.host };
  const resultA = await api.functional.community.posts.index(guestConnection, {
    body: {
      communityId: communityX.id,
      page: 1,
      limit: 20,
    } satisfies ICommunityPost.IRequest,
  });
  typia.assert(resultA);
  // All posts must belong to community X
  for (const post of resultA.data) {
    TestValidator.equals(
      "post community is X",
      post.community.id,
      communityX.id,
    );
  }
  // No posts from community Y should appear
  const communityYPostIds = [linkPost1.id, linkPost2.id];
  for (const post of resultA.data) {
    TestValidator.predicate(
      "no community Y posts in communityId filter",
      !communityYPostIds.includes(post.id),
    );
  }
  // ── Scenario B: Filter by type only ───────────────────────────────────────
  const resultB = await api.functional.community.posts.index(guestConnection, {
    body: {
      type: "text",
      page: 1,
      limit: 20,
    } satisfies ICommunityPost.IRequest,
  });
  typia.assert(resultB);
  // All returned posts must have type === 'text'
  for (const post of resultB.data) {
    TestValidator.equals("post type is text", post.type, "text");
    // Preview must be ITextPreview shape
    TestValidator.equals("preview type is text", post.preview.type, "text");
  }
  // ── Scenario C: Combined communityId + type filter ─────────────────────────
  const resultC = await api.functional.community.posts.index(guestConnection, {
    body: {
      communityId: communityX.id,
      type: "image",
      page: 1,
      limit: 20,
    } satisfies ICommunityPost.IRequest,
  });
  typia.assert(resultC);
  // All posts must be from community X and type image
  for (const post of resultC.data) {
    TestValidator.equals(
      "post community is X (combined)",
      post.community.id,
      communityX.id,
    );
    TestValidator.equals("post type is image", post.type, "image");
    TestValidator.equals("preview type is image", post.preview.type, "image");
  }
  // No text or link posts in result C
  const textAndLinkPostIds = [
    textPost1.id,
    textPost2.id,
    linkPost1.id,
    linkPost2.id,
  ];
  for (const post of resultC.data) {
    TestValidator.predicate(
      "no text or link posts in combined filter",
      !textAndLinkPostIds.includes(post.id),
    );
  }
  // Verify pagination metadata for Scenario C
  TestValidator.predicate(
    "pagination records reflects image posts in communityX",
    resultC.pagination.records >= 2,
  );
  TestValidator.equals(
    "pagination current page is 1",
    resultC.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", resultC.pagination.limit, 20);
}
