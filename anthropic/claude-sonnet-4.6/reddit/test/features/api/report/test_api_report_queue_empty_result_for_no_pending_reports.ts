import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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

export async function test_api_report_queue_empty_result_for_no_pending_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member A (will become community owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // 2. Create a community as member A
  const community = await generate_random_community_member_communities_create(
    memberAConnection,
    {},
  );
  typia.assert(community);
  // 3. Query the empty report queue (no reports submitted) — basic pagination
  const result =
    await api.functional.community.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(result);
  // Validate empty result structure
  TestValidator.equals("data should be empty", result.data.length, 0);
  TestValidator.equals(
    "pagination.records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination.pages should be 0",
    result.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination.current should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should be 20",
    result.pagination.limit,
    20,
  );
  // 4. Apply search filter — still empty
  const resultWithSearch =
    await api.functional.community.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          search: "some search term",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(resultWithSearch);
  TestValidator.equals(
    "search filter: data should be empty",
    resultWithSearch.data.length,
    0,
  );
  // 5. Apply targetType: 'post' filter — still empty
  const resultPostFilter =
    await api.functional.community.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          targetType: "post",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(resultPostFilter);
  TestValidator.equals(
    "post filter: data should be empty",
    resultPostFilter.data.length,
    0,
  );
  // 6. Apply targetType: 'comment' filter — still empty
  const resultCommentFilter =
    await api.functional.community.member.communities.reports.index(
      memberAConnection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 20,
          targetType: "comment",
        } satisfies ICommunityReport.IRequest,
      },
    );
  typia.assert(resultCommentFilter);
  TestValidator.equals(
    "comment filter: data should be empty",
    resultCommentFilter.data.length,
    0,
  );
}
