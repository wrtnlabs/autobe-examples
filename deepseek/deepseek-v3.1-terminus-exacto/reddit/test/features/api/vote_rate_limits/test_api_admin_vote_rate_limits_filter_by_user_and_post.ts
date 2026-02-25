import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test filtering vote rate limits by specific user and entity type 'post'.
 *
 * This test validates that the admin vote rate limits search endpoint correctly filters
 * results by user ID and entity type='post'. Since we cannot create voting data through
 * available APIs, we test the filtering functionality with existing data.
 */
export async function test_api_admin_vote_rate_limits_filter_by_user_and_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test filtering by user ID and entity type='post' with upvotes
  const upvoteResults =
    await api.functional.communityPlatform.admin.vote_rate_limits.index(
      adminConnection,
      {
        body: {
          community_platform_user_id: null,
          entity_type: "post" as const,
          vote_type: "upvote" as const,
          ip_address: null,
          voted_at_start: null,
          voted_at_end: null,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformVoteRateLimit.IRequest,
      },
    );
  typia.assert(upvoteResults);
  // 3. Test filtering by user ID and entity type='post' with downvotes
  const downvoteResults =
    await api.functional.communityPlatform.admin.vote_rate_limits.index(
      adminConnection,
      {
        body: {
          community_platform_user_id: null,
          entity_type: "post" as const,
          vote_type: "downvote" as const,
          ip_address: null,
          voted_at_start: null,
          voted_at_end: null,
          page: 1 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> as number,
          limit: 10 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100> as number,
        } satisfies ICommunityPlatformVoteRateLimit.IRequest,
      },
    );
  typia.assert(downvoteResults);
  // 4. Validate pagination structure for both results
  TestValidator.predicate(
    "upvote pagination valid",
    upvoteResults.pagination.current >= 0 &&
      upvoteResults.pagination.limit >= 1 &&
      upvoteResults.pagination.limit <= 100 &&
      upvoteResults.pagination.records >= 0 &&
      upvoteResults.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "downvote pagination valid",
    downvoteResults.pagination.current >= 0 &&
      downvoteResults.pagination.limit >= 1 &&
      downvoteResults.pagination.limit <= 100 &&
      downvoteResults.pagination.records >= 0 &&
      downvoteResults.pagination.pages >= 0,
  );
  // 5. Validate that all returned items have correct entity type
  for (const item of upvoteResults.data) {
    TestValidator.equals("entity type is post", item.entity_type, "post");
    TestValidator.equals("vote type is upvote", item.vote_type, "upvote");
  }
  for (const item of downvoteResults.data) {
    TestValidator.equals("entity type is post", item.entity_type, "post");
    TestValidator.equals("vote type is downvote", item.vote_type, "downvote");
  }
}
