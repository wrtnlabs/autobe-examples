import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_community_feed_sorting_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create posts with varying types for filtering tests
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Text post for sorting test",
        communityName: community.name,
        type: "text" as const,
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: "Link post for sorting test",
        communityName: community.name,
        type: "link" as const,
      },
    },
  );
  typia.assert(linkPost);
  // 4. Test 'new' sort - posts ordered by created_at DESC
  const newSortResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "new",
          limit: 10,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(newSortResponse);
  TestValidator.equals("has data", newSortResponse.data.length > 0, true);
  // Verify posts are ordered by created_at DESC (newest first)
  if (newSortResponse.data.length >= 2) {
    const firstCreatedAt = new Date(newSortResponse.data[0].created_at);
    const secondCreatedAt = new Date(newSortResponse.data[1].created_at);
    TestValidator.predicate(
      "new sort: posts ordered by created_at DESC",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // 5. Test 'top' sort with time filter 'week'
  const topSortResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "top",
          timeRange: "week",
          limit: 10,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(topSortResponse);
  TestValidator.equals("has data", topSortResponse.data.length > 0, true);
  // 6. Test 'controversial' sort with time filter 'month'
  const controversialSortResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          sort: "controversial",
          timeRange: "month",
          limit: 10,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(controversialSortResponse);
  // 7. Test post type filter - 'text' only
  const textFilterResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          postType: "text",
          limit: 10,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(textFilterResponse);
  for (const post of textFilterResponse.data) {
    TestValidator.equals("post type is text", post.type, "text");
  }
  // Test post type filter - 'link' only
  const linkFilterResponse =
    await api.functional.redditClone.member.communities.posts.index(
      memberConnection,
      {
        communityName: community.name,
        body: {
          postType: "link",
          limit: 10,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(linkFilterResponse);
  for (const post of linkFilterResponse.data) {
    TestValidator.equals("post type is link", post.type, "link");
  }
  // 8. Test invalid community name returns 404
  await TestValidator.httpError(
    "invalid community name returns 404",
    404,
    async () => {
      await api.functional.redditClone.member.communities.posts.index(
        memberConnection,
        {
          communityName: "nonexistent_community_xyz_12345",
          body: {
            limit: 10,
          } satisfies IRedditClonePostLink.IRequest,
        },
      );
    },
  );
}
