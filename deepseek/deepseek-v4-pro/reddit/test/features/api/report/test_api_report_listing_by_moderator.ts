import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import type { ICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test that a community owner (who holds moderator privileges) can successfully
 * retrieve the paginated list of reports for their community.
 *
 * Validates the report listing authorization flow where the community owner
 * creates a community and then accesses the moderator-only report listing
 * endpoint. The response must return HTTP 200 with a properly structured
 * IPageICommunityHubReport.ISummary containing pagination metadata and a
 * (possibly empty) array of report summaries.
 *
 * Special attention is given to verifying that the default pagination returns
 * page 1 with the correct metadata structure, and that the data array conforms
 * to the ICommunityHubReport.ISummary structure even when no reports have been
 * filed yet.
 *
 * 1. Member registers and authenticates via authorize_member_join.
 * 2. Member creates a community, becoming its owner and gaining moderator
 *    privileges.
 * 3. Owner accesses the report listing endpoint for their community with
 *    default pagination.
 * 4. Validates the response structure including pagination defaults and
 *    the empty report data array.
 */
export async function test_api_report_listing_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community (member becomes owner = moderator)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Access report listing endpoint
  const reports =
    await api.functional.communityHub.member.communities.reports.index(
      memberConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityHubReport.IRequest,
      },
    );
  typia.assert(reports);
  // 4. Validate pagination defaults
  TestValidator.equals("default page is 1", reports.pagination.current, 1);
}
