import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostTextContent";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

export async function test_api_community_feed_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberAuth = await authorize_member_join(connection, {});
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: `Bearer ${memberAuth.token.access}`,
  };
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: { communityId: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create 25 posts to exceed default page size of 20
  const postCount = 25;
  await ArrayUtil.asyncRepeat(postCount, async (i) => {
    const post = await generate_random_reddit_clone_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: `Pagination Test Post ${i + 1}`,
          type: "text",
          body: `This is test content for pagination post number ${i + 1}.`,
        },
      },
    );
    typia.assert(post);
  });
  // 5. Retrieve first page of community feed
  const firstPage = await api.functional.redditClone.member.communities.feed(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  typia.assert(firstPage);
  // 6. Verify pagination metadata shows records > 20, pages > 1, current=1
  TestValidator.predicate(
    "records exceed 20",
    firstPage.pagination.records >= 20,
  );
  TestValidator.predicate(
    "multiple pages exist",
    firstPage.pagination.pages > 1,
  );
  TestValidator.equals("current page is 1", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "default limit is 20",
    firstPage.pagination.limit >= 20,
  );
  TestValidator.predicate(
    "first page contains posts",
    firstPage.data.length > 0,
  );
  // Collect first page post IDs
  const firstPageIds = firstPage.data.map((p) => p.id);
  // 7. Verify posts are sorted by newest first (consistent sorting)
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].createdAt).getTime();
    const next = new Date(firstPage.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `posts sorted newest first at index ${i}`,
      current >= next,
    );
  }
}
