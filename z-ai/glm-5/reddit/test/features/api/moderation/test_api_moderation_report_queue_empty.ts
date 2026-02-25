import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

/**
 * Test scenario where a community owner views an empty report queue.
 *
 * This validates:
 * 1. Moderator authorization passes for community owners
 * 2. Empty paginated response has correct structure
 * 3. Pagination metadata shows records=0, pages=0
 * 4. Data array is empty
 */
export async function test_api_moderation_report_queue_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member who will become community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create community (owner gets automatic moderator privileges)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Query reports for the community (should be empty - no reports created yet)
  const reportQueue =
    await api.functional.community.member.communities.reports.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(reportQueue);
  // 4. Validate empty report queue structure
  TestValidator.equals("current page is 1", reportQueue.pagination.current, 1);
  TestValidator.predicate(
    "limit is positive",
    reportQueue.pagination.limit > 0,
  );
  TestValidator.equals("no records", reportQueue.pagination.records, 0);
  TestValidator.equals("no pages", reportQueue.pagination.pages, 0);
  TestValidator.equals("data is empty", reportQueue.data.length, 0);
}
