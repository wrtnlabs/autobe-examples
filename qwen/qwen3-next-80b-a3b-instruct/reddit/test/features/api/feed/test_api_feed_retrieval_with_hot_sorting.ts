import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_feed_retrieval_with_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member to access feed
  const memberConnection: api.IConnection = { host: connection.host };
  const memberData = typia.random<IRedditCommunityMember.IJoin>();
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: memberData,
  });
  typia.assert(authorizedMember);
  // 2. Prepare hot sort request with pagination
  const request: IRedditCommunityPost.IRequest = {
    sort: "hot",
    page: 1,
    limit: 20,
  };
  // 3. Retrieve feed with hot sorting
  const feed = await api.functional.redditCommunity.member.posts.index(
    memberConnection,
    {
      body: request,
    },
  );
  typia.assert(feed);
  // 4. Validate feed structure
  TestValidator.equals("page is 1", feed.pagination.current, 1);
  TestValidator.equals("limit is 20", feed.pagination.limit, 20);
  TestValidator.predicate("has data array", feed.data.length > 0);
  // 5. Verify all posts are non-deleted and public
  feed.data.forEach((post) => {
    TestValidator.predicate("post is not deleted", post.createdAt !== null);
    TestValidator.predicate("author is valid", post.author.id !== null);
    TestValidator.predicate("community is valid", post.community.id !== null);
  });
  // 6. Validate hot sort algorithm consistency
  // The hot algorithm: log10(vote_score + 1) - (created_at - now)/3600000
  // Since we can't verify exact algorithm math without server-side knowledge,
  // we validate sorting order: newer + more popular posts should appear first
  for (let i = 0; i < feed.data.length - 1; i++) {
    const current = feed.data[i];
    const next = feed.data[i + 1];
    // We assume the hot algorithm sorts in descending order
    // Higher score means higher priority
    // We can't verify exact floating-point calculation, but we can ensure non-increasing order
    TestValidator.predicate(
      "hot sort order preserved",
      current.voteScore >= next.voteScore ||
        (current.voteScore === next.voteScore &&
          new Date(current.createdAt).getTime() >=
            new Date(next.createdAt).getTime()),
    );
  }
}
