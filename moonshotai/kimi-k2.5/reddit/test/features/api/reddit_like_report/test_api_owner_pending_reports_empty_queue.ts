import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import type { IRedditLikeReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";

/**
 * Owner retrieves pending reports for a community that has no pending reports.
 *
 * Test scenario involves:
 * 1. Member authenticates and creates a community (becoming the owner)
 * 2. Owner authenticates via owner-specific endpoint
 * 3. Owner retrieves pending reports for the community
 * 4. Validates empty result with correct pagination metadata
 */
export async function test_api_owner_pending_reports_empty_queue(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {},
  );
  typia.assert(memberAuth);
  // Step 2: Member creates community (becoming the owner)
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Owner authenticates via owner-specific endpoint
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth: IRedditLikeOwner.IAuthorized = await authorize_owner_join(
    ownerConnection,
    {},
  );
  typia.assert(ownerAuth);
  // Step 4: Owner retrieves pending reports for the newly created community
  const reports: IPageIRedditLikeReport =
    await api.functional.redditLike.owner.communities.reports.pending.indexPending(
      ownerConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(reports);
  // Step 5: Validate empty queue response structure and pagination metadata
  TestValidator.equals("data array is empty", reports.data, []);
  TestValidator.equals("current page is 1", reports.pagination.current, 1);
  TestValidator.equals("records count is 0", reports.pagination.records, 0);
  TestValidator.equals("pages count is 0", reports.pagination.pages, 0);
}
