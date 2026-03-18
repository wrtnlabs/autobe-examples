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

export async function test_api_moderation_reports_moderator_scoped_list_and_filters(
  connection: api.IConnection,
): Promise<void> {
  // Moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // Create moderator community (moderation scope)
  const moderatorCommunity: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {
        body: {
          name: `mod-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href:
            `https://example.com/icon/${RandomGenerator.alphabets(8)}` satisfies string &
              tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(moderatorCommunity);
  // Reporter account
  const reporterConnection: api.IConnection = { host: connection.host };
  const reporterAuth = await authorize_member_join(reporterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(reporterAuth);
  // Create a post target (utility returns void => cannot capture id)
  // However report creation requires targetId, so we must create reports using the report creation utility
  // that can prepare all necessary target associations internally.
  // We'll rely on report-create utility by providing only reason and community scope via targetId can't be omitted,
  // so instead we create reports using report-create utility with generated target inside its prepare.
  const reason1 = `spam report ${RandomGenerator.alphabets(6)}`;
  const createdReport1: ICommunityPlatformReport =
    await generate_random_community_platform_member_reports_create(
      reporterConnection,
      {
        body: {
          communityId: moderatorCommunity.id,
          targetType: "post",
          targetId: typia.random<string & tags.Format<"uuid">>(),
          reason: reason1,
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(createdReport1);
  // Moderator lists reports for their community
  const page1 = await api.functional.communityPlatform.member.reports.index(
    moderatorConnection,
    {
      body: {
        community_id: moderatorCommunity.id,
        target_type: null,
        reason_keyword: null,
        created_at_from: null,
        created_at_to: null,
        updated_at_from: null,
        updated_at_to: null,
        resolution_state: null,
        include_deleted: false,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformReport.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.predicate("has at least one report", page1.data.length > 0);
  const matched = page1.data.find((x) => x.id === createdReport1.id);
  TestValidator.predicate(
    "created report appears in list",
    matched !== undefined,
  );
  if (matched) {
    typia.assert(matched);
    TestValidator.equals(
      "community scoped",
      matched.community.id,
      moderatorCommunity.id,
    );
    TestValidator.predicate(
      "reporter display_name non-empty",
      matched.reporter.display_name.length > 0,
    );
    TestValidator.equals("reason exact match", matched.reason, reason1);
    TestValidator.equals(
      "target type",
      matched.target.target_type,
      createdReport1.targetType,
    );
    TestValidator.equals(
      "target id",
      matched.target.target_id,
      createdReport1.targetId,
    );
    TestValidator.equals("deletedAt is null", matched.deletedAt, null);
  }
  // Second community for access denial
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherModeratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const otherCommunity: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      otherModeratorConnection,
      {
        body: {
          name: `other-${RandomGenerator.alphabets(10)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href:
            `https://example.com/icon/${RandomGenerator.alphabets(8)}` satisfies string &
              tags.Format<"uri">,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  // Create another report in other community
  await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: otherCommunity.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: `harassment ${RandomGenerator.alphabets(8)}`,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  await TestValidator.httpError(
    "moderator cannot view reports from another community",
    [401, 403, 404],
    async () => {
      await api.functional.communityPlatform.member.reports.index(
        moderatorConnection,
        {
          body: {
            community_id: otherCommunity.id,
            target_type: null,
            reason_keyword: null,
            created_at_from: null,
            created_at_to: null,
            updated_at_from: null,
            updated_at_to: null,
            resolution_state: null,
            include_deleted: false,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    },
  );
  // Filtering + pagination
  const reasonSpam = `spam ${RandomGenerator.alphabets(8)}`;
  const reasonHarassment = `harassment ${RandomGenerator.alphabets(8)}`;
  const reasonSpammy = `spammy ${RandomGenerator.alphabets(8)}`;
  await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: moderatorCommunity.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: reasonSpam,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: moderatorCommunity.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: reasonHarassment,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  await generate_random_community_platform_member_reports_create(
    reporterConnection,
    {
      body: {
        communityId: moderatorCommunity.id,
        targetType: "post",
        targetId: typia.random<string & tags.Format<"uuid">>(),
        reason: reasonSpammy,
      } satisfies ICommunityPlatformReport.ICreate,
    },
  );
  const filteredPage1 =
    await api.functional.communityPlatform.member.reports.index(
      moderatorConnection,
      {
        body: {
          community_id: moderatorCommunity.id,
          target_type: null,
          reason_keyword: "spam",
          created_at_from: null,
          created_at_to: null,
          updated_at_from: null,
          updated_at_to: null,
          resolution_state: null,
          include_deleted: false,
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(filteredPage1);
  TestValidator.predicate(
    "all returned reasons include spam keyword",
    filteredPage1.data.every((x) => x.reason.includes("spam")),
  );
  if (filteredPage1.pagination.records > 2) {
    const filteredPage2 =
      await api.functional.communityPlatform.member.reports.index(
        moderatorConnection,
        {
          body: {
            community_id: moderatorCommunity.id,
            target_type: null,
            reason_keyword: "spam",
            created_at_from: null,
            created_at_to: null,
            updated_at_from: null,
            updated_at_to: null,
            resolution_state: null,
            include_deleted: false,
            page: 2,
            limit: 2,
          } satisfies ICommunityPlatformReport.IRequest,
        },
      );
    typia.assert(filteredPage2);
    const ids = new Set(filteredPage1.data.map((x) => x.id));
    TestValidator.predicate("no duplicates between pages", () =>
      filteredPage2.data.every((x) => !ids.has(x.id)),
    );
  }
}
