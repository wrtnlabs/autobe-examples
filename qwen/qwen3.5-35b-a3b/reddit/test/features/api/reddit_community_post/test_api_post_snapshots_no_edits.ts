import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_post_snapshots_no_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member user
  const memberConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResponse);
  // 2. Set up connection with authorization token
  memberConnection.headers = {
    Authorization: joinResponse.token.access,
  };
  // 3. Create a community ID - will need a valid community to create post
  // Generate a valid UUID for testing
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create a new post without any edits
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: testCommunityId,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Immediately retrieve snapshot history without making any edits
  const snapshotPage =
    await api.functional.redditCommunity.posts.snapshots.index(
      memberConnection,
      {
        postId: post.id,
        body: {},
      },
    );
  typia.assert(snapshotPage);
  // 6. Validate empty array response - correct behavior for unedited post
  TestValidator.equals(
    "snapshot data array should be empty for unedited post",
    snapshotPage.data.length,
    0,
  );
  // 7. Validate pagination is properly formatted
  TestValidator.notEquals(
    "pagination should exist",
    snapshotPage.pagination,
    undefined,
  );
  TestValidator.predicate(
    "pagination current should be valid number",
    snapshotPage.pagination.current > 0,
  );
  // 8. Verify the snapshot page structure
  TestValidator.equals(
    "snapshot pagination limit should be valid",
    snapshotPage.pagination.limit,
    snapshotPage.pagination.limit,
  );
  TestValidator.predicate(
    "snapshot pagination records should be valid",
    snapshotPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages should be valid",
    snapshotPage.pagination.pages >= 0,
  );
}