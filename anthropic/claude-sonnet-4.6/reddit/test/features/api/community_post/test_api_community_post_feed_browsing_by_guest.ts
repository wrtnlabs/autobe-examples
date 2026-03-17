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

export async function test_api_community_post_feed_browsing_by_guest(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new community using the member connection
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe the member to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text-type post
  const textPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost);
  // 5. Create a link-type post
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
  // 6. Guest connection - no Authorization header
  const guestConnection: api.IConnection = { host: connection.host };
  // 7. Browse the community post feed as a guest
  const feed = await api.functional.community.communities.posts.index(
    guestConnection,
    {
      communityId: community.id,
      body: {} satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feed);
  // 8. Validate pagination records >= 2
  TestValidator.predicate(
    "pagination records >= 2",
    feed.pagination.records >= 2,
  );
  // 9. Validate data array has enough items
  TestValidator.predicate("data array has items", feed.data.length >= 2);
  // 10. Validate each post's community.id matches, author.id matches,
  //     and vote_score / comment_count default to 0
  for (const post of feed.data) {
    TestValidator.equals(
      "community id matches",
      post.community.id,
      community.id,
    );
    TestValidator.equals("vote_score is 0", post.vote_score, 0);
    TestValidator.equals("comment_count is 0", post.comment_count, 0);
    TestValidator.equals("author id matches", post.author.id, member.id);
  }
  // 11. Find the text post and verify preview shape
  const foundTextPost = feed.data.find((p) => p.id === textPost.id);
  TestValidator.predicate(
    "text post found in feed",
    foundTextPost !== undefined,
  );
  if (foundTextPost !== undefined) {
    TestValidator.equals("text post type", foundTextPost.type, "text");
    TestValidator.equals(
      "text preview type",
      foundTextPost.preview.type,
      "text",
    );
    if (foundTextPost.preview.type === "text") {
      TestValidator.predicate(
        "text snippet max 200 chars",
        foundTextPost.preview.snippet.length <= 200,
      );
    }
  }
  // 12. Find the link post and verify preview shape
  const foundLinkPost = feed.data.find((p) => p.id === linkPost.id);
  TestValidator.predicate(
    "link post found in feed",
    foundLinkPost !== undefined,
  );
  if (foundLinkPost !== undefined) {
    TestValidator.equals("link post type", foundLinkPost.type, "link");
    TestValidator.equals(
      "link preview type",
      foundLinkPost.preview.type,
      "link",
    );
  }
  // 13. Edge case: invalid communityId => 404
  await TestValidator.httpError(
    "non-existent communityId returns 404",
    404,
    async () => {
      await api.functional.community.communities.posts.index(guestConnection, {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies ICommunityPost.IRequest,
      });
    },
  );
}
