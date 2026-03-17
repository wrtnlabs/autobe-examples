import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_owner_moderators_create } from "../../../generate/generate_random_reddit_like_owner_moderators_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_moderator } from "../../../prepare/prepare_random_reddit_like_moderator";

/**
 * Test the edge case where a moderator queries the reports endpoint when there are no pending
 * reports in their moderated communities. Creates owner and moderator accounts, establishes
 * a community, assigns moderator role, then queries reports to verify empty data array with
 * zero records/pages pagination and 200 OK response status.
 */
export async function test_api_moderator_report_queue_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_owner_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Moderator (member) authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_moderator_join(
    moderatorConnection,
    {},
  );
  typia.assert(moderatorMember);
  // 3. Owner creates a community
  const community = await generate_random_reddit_like_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 4. Owner assigns moderator role to the member
  const moderator = await generate_random_reddit_like_owner_moderators_create(
    ownerConnection,
    {
      body: {
        communityId: community.id,
        memberId: moderatorMember.id,
        canAddModerators: false,
      },
    },
  );
  typia.assert(moderator);
  // 5. Moderator queries reports for the community (no reports created)
  const reports = await api.functional.redditLike.moderator.reports.index(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        status: "pending",
        createdAtFrom: null,
        createdAtTo: null,
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(reports);
  // 6. Verify empty data array - business logic validation
  TestValidator.equals("data array is empty", reports.data.length, 0);
  // 7. Verify pagination shows zero records
  TestValidator.equals(
    "pagination records is zero",
    reports.pagination.records,
    0,
  );
  TestValidator.equals("pagination pages is zero", reports.pagination.pages, 0);
}
