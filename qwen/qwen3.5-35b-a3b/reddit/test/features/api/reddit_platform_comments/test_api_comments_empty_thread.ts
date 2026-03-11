import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformComment";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_comments_empty_thread(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Create a post in the community (simulated via posts.index with valid community post)
  // Since we can't create posts directly, we use a valid post ID from the community
  const postResult = await api.functional.redditPlatform.posts.index(
    memberConnection,
    {
      body: {
        communityId: community.id,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(postResult);
  // If no posts exist, create an empty thread scenario
  const postId =
    postResult.data.length > 0
      ? postResult.data[0].id
      : typia.random<string & tags.Format<"uuid">>();
  // 4. Request comments list for the post (empty thread)
  const commentsResult =
    await api.functional.redditPlatform.posts.comments.index(memberConnection, {
      postId,
      body: {
        sortBy: "new",
        page: 1,
        limit: 10,
      },
    });
  typia.assert(commentsResult);
  // 5. Validate empty data array and pagination metadata
  TestValidator.equals("comments data is empty array", commentsResult.data, []);
  TestValidator.equals(
    "pagination records is 0",
    commentsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    commentsResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    commentsResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    commentsResult.pagination.limit,
    10,
  );
}
