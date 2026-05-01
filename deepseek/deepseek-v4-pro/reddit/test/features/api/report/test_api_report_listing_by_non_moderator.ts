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
 * Test that a non-moderator member receives 403 Forbidden when attempting to list reports for a community they do not moderate.
 *
 * Validates the moderator authorization gate on the report listing endpoint by having Member A create and own a community, then having Member B — a completely separate member with no moderator role — attempt to access the community's report list. The system must reject the request with HTTP 403, confirming that only community moderators and owners can view moderation reports.
 *
 * 1. Member A registers and creates a community, becoming its owner and moderator.
 * 2. Member B registers independently with no relationship to Member A's community.
 * 3. Member B attempts to list reports for Member A's community, expecting 403 Forbidden.
 */
export async function test_api_report_listing_by_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates account and community
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_hub_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 2. Member B creates account (different member, no moderator role)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // 3. Member B attempts to list reports → expect 403
  await TestValidator.httpError(
    "non-moderator cannot list reports",
    403,
    async () => {
      await api.functional.communityHub.member.communities.reports.index(
        memberBConnection,
        {
          communityName: community.name,
          body: {},
        },
      );
    },
  );
}
