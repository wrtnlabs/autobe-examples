import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_reports_create } from "../../../generate/generate_random_community_platform_member_reports_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_report } from "../../../prepare/prepare_random_community_platform_report";

export async function test_api_moderation_reports_pagination_stable_ordering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Moderator/member setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    moderatorConnection,
    {
      body: {
        name: RandomGenerator.alphabets(12),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2) Create multiple reports for the community.
  //    Since we don't have a post-id retrieval endpoint, we rely on the
  //    report preparation utility to create a valid target context and set targetId.
  const reporterConnections: api.IConnection[] = ArrayUtil.repeat(5, () => ({
    host: connection.host,
  }));
  await ArrayUtil.asyncForEach(reporterConnections, async (c) => {
    await authorize_member_join(c, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  });
  const reports = await ArrayUtil.asyncMap(reporterConnections, async (c) => {
    const created =
      await generate_random_community_platform_member_reports_create(c, {
        body: {
          communityId: community.id,
          targetType: "text" as string,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          // omit targetId so the prepare function can create a valid target
          // for the given communityId & targetType
          targetId: undefined as unknown as string,
        } as DeepPartial<ICommunityPlatformReport.ICreate>,
      });
    typia.assert(created);
    return created;
  });
  // ensure at least 5 reports created
  TestValidator.predicate("reports created", () => reports.length >= 5);
  // 3) Pagination requests
  const baseBody: ICommunityPlatformReport.IRequest = {
    community_id: community.id,
    target_type: null,
    reason_keyword: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    resolution_state: null,
    include_deleted: false,
    page: 1,
    limit: 2,
  };
  const page1 = await api.functional.communityPlatform.member.reports.index(
    moderatorConnection,
    {
      body: {
        ...baseBody,
        page: 1,
        limit: 2,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.communityPlatform.member.reports.index(
    moderatorConnection,
    {
      body: {
        ...baseBody,
        page: 2,
        limit: 2,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(page2);
  const ids1 = page1.data.map((r) => r.id);
  const ids2 = page2.data.map((r) => r.id);
  const unionLimit10 =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          ...baseBody,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(unionLimit10);
  const idsLimit10 = unionLimit10.data.map((r) => r.id);
  // 4) Validations
  const overlap = ids1.filter((id) => ids2.includes(id));
  TestValidator.equals("page1 and page2 ids do not overlap", overlap.length, 0);
  const unionIds = [...ids1, ...ids2];
  TestValidator.predicate("union is subset of limit=10", () =>
    unionIds.every((id) => idsLimit10.includes(id)),
  );
  // pagination metadata consistency
  TestValidator.equals(
    "records consistent across pages",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "pages consistent across pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  TestValidator.equals(
    "limit consistent across pages",
    page1.pagination.limit,
    page2.pagination.limit,
  );
  TestValidator.equals("current correct page1", page1.pagination.current, 1);
  TestValidator.equals("current correct page2", page2.pagination.current, 2);
  // also consistent with larger limit for records/pages (current differs, limit differs)
  TestValidator.equals(
    "records consistent with limit=10",
    page1.pagination.records,
    unionLimit10.pagination.records,
  );
  TestValidator.equals(
    "pages consistent with limit=10",
    page1.pagination.pages,
    unionLimit10.pagination.pages,
  );
}
