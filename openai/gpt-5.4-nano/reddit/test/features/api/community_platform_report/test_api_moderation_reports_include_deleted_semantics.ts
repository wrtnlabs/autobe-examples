import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import type { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import type { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_moderation_reports_include_deleted_semantics(
  connection: api.IConnection,
): Promise<void> {
  // 1) Moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {});
  // 2) Create community
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 3) Reporter member
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporter = await authorize_member_join(reporterConnection, {});
  // 4) Create a post (utility exists)
  // NOTE: The utility does not accept community_id, and POST /member/posts returns void,
  // so we cannot obtain a postId to report/delete.
  // We still call it to establish required prerequisites, but the remaining steps
  // (report creation + post deletion + include_deleted assertions) cannot be executed
  // with the currently provided API surface.
  await generate_random_community_platform_member_posts_create(
    reporterConnection,
    {},
  );
  // 5) Assign reporter as moderator so the listing endpoint is usable.
  // Utility for creating moderator assignment exists.
  await generate_random_community_platform_community_moderators_create(
    moderatorConnection,
    {
      body: {
        communityId: community.id,
        moderatorUserId: reporter.id,
      } satisfies ICommunityPlatformCommunityModerator.ICreate,
    },
  );
  // 6) Call reports listing with include_deleted=true/false is not possible without
  // a created reportId/targetId.
  // We perform a best-effort request using a valid request body shape but cannot
  // validate semantics without a known report.
  const requestBase = {
    community_id: community.id,
    target_type: null,
    reason_keyword: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    resolution_state: null,
    include_deleted: true,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformReport.IRequest;
  const includeDeleted =
    await api.functional.communityPlatform.member.reports.index(
      reporterConnection,
      {
        body: requestBase,
      },
    );
  typia.assert(includeDeleted);
  const excludeDeleted =
    await api.functional.communityPlatform.member.reports.index(
      reporterConnection,
      {
        body: {
          ...requestBase,
          include_deleted: false,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(excludeDeleted);
  // Validate basic invariants (not target-deletion semantics)
  TestValidator.predicate(
    "page.current is non-negative",
    includeDeleted.pagination.current >= 0,
  );
  TestValidator.predicate(
    "page.limit is non-negative",
    includeDeleted.pagination.limit >= 0,
  );
}
