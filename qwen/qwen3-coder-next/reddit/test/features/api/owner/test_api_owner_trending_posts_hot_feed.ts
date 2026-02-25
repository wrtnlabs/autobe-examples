import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentPost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_trending_posts_hot_feed(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerData: IRedditCloneOwner.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    username: `owner_${RandomGenerator.alphaNumeric(8)}`,
    displayName: "Test Owner",
  };
  const ownerAuth: IRedditCloneOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    { body: ownerData },
  );
  typia.assert(ownerAuth);
  // Step 2: Call trending endpoint with hot sort algorithm
  const trendingData: IRedditCloneContentPost.IRequest = {
    sort: "hot",
    page: 1,
    limit: 10,
  };
  const result: IPageIRedditCloneContentPost.ISummary =
    await api.functional.redditClone.owner.analytics.posts.trending(
      ownerConnection,
      {
        body: trendingData,
      },
    );
  typia.assert(result);
  // Step 3: Validate response structure
  TestValidator.equals("has pagination", result.pagination !== null, true);
  TestValidator.equals("has data array", Array.isArray(result.data), true);
  // Validate pagination structure using a separate check
  if (result.pagination !== null) {
    TestValidator.equals("pagination current >= 0", result.pagination.current >= 0, true);
    TestValidator.equals("pagination limit >= 0", result.pagination.limit >= 0, true);
    TestValidator.equals("pagination records >= 0", result.pagination.records >= 0, true);
    TestValidator.equals("pagination pages >= 0", result.pagination.pages >= 0, true);
  }
  // Step 4: Validate post summary structure
  if (result.data.length > 0) {
    const firstPost: IRedditCloneContentPost.ISummary = result.data[0];
    TestValidator.equals("post has id", firstPost.id !== undefined, true);
    TestValidator.equals("post has title", firstPost.title !== undefined, true);
    TestValidator.equals(
      "post has author",
      firstPost.author !== undefined,
      true,
    );
    TestValidator.equals(
      "post has community",
      firstPost.community !== undefined,
      true,
    );
    TestValidator.equals(
      "post has voteScore",
      firstPost.voteScore !== undefined,
      true,
    );
    TestValidator.equals(
      "post has commentCount",
      firstPost.commentCount !== undefined,
      true,
    );
    TestValidator.equals(
      "post has viewCount",
      firstPost.viewCount !== undefined,
      true,
    );
    TestValidator.equals(
      "post has upvoteCount",
      firstPost.upvoteCount !== undefined,
      true,
    );
    TestValidator.equals(
      "post has downvoteCount",
      firstPost.downvoteCount !== undefined,
      true,
    );
    TestValidator.equals(
      "post has timeAgo",
      firstPost.timeAgo !== undefined,
      true,
    );
    TestValidator.equals(
      "post has trendingScore",
      firstPost.trendingScore !== undefined,
      true,
    );
    TestValidator.equals(
      "post has engagementRate",
      firstPost.engagementRate !== undefined,
      true,
    );
    TestValidator.equals(
      "post has created_at",
      firstPost.created_at !== undefined,
      true,
    );
    // Validate author structure
    TestValidator.equals(
      "author has id",
      firstPost.author.id !== undefined,
      true,
    );
    TestValidator.equals(
      "author has username",
      firstPost.author.username !== undefined,
      true,
    );
    // Validate community structure
    TestValidator.equals(
      "community has id",
      firstPost.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      firstPost.community.name !== undefined,
      true,
    );
  }
}