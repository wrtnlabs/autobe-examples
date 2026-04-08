import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_moderators_create } from "../../../generate/generate_random_reddit_community_member_communities_moderators_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_moderator } from "../../../prepare/prepare_random_reddit_community_moderator";

/**
 * Test the edge case where a moderator views pending reports but the community has no pending reports.
 *
 * Validates that the pending reports endpoint handles the empty queue scenario correctly. This is a critical edge case for moderator workflows where a newly created community or a community with all resolved reports should return an empty paginated response without errors.
 *
 * The test ensures that the pagination metadata is correctly populated even when no reports exist, with records count at 0 and appropriate pages calculation. This validates the backend's ability to handle empty result sets gracefully.
 *
 * 1. Member account is created with randomized credentials.
 * 2. Community is created by the member (member becomes owner automatically).
 * 3. Member is explicitly assigned as moderator to the community (reinforces moderator role).
 * 4. Pending reports endpoint is called without creating any reports.
 * 5. Validates response contains empty data array and correct pagination metadata.
 */
export async function test_api_report_pending_empty_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community (member becomes owner automatically)
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Assign member as moderator to the community (explicit moderator assignment)
  const moderator =
    await generate_random_reddit_community_member_communities_moderators_create(
      memberConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: memberAuth.id,
          role: "moderator",
        } satisfies IRedditCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 4. Call pending reports endpoint (no reports exist - empty queue scenario)
  const pendingReports =
    await api.functional.redditCommunity.member.communities.reports.pending.index(
      memberConnection,
      {
        communityId: community.id,
        body: {} satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(pendingReports);
  // 5. Validate empty queue response
  TestValidator.equals("data array is empty", pendingReports.data.length, 0);
  TestValidator.equals(
    "records count is zero",
    pendingReports.pagination.records,
    0,
  );
  TestValidator.equals(
    "current page is 1",
    pendingReports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pages is 0 or 1",
    pendingReports.pagination.pages === 0 ||
      pendingReports.pagination.pages === 1,
  );
  TestValidator.predicate(
    "limit is positive",
    pendingReports.pagination.limit > 0,
  );
}
