import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_report_review } from "../prepare/prepare_random_community_platform_report_review";

export async function generate_random_community_platform_member_communities_reports_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportReview.ICreate> | undefined;
    params: {
      communityId: string;
      reportId: string;
    };
  },
): Promise<ICommunityPlatformReportReview> {
  const prepared: ICommunityPlatformReportReview.ICreate =
    prepare_random_community_platform_report_review(props.body);
  const result: ICommunityPlatformReportReview =
    await api.functional.communityPlatform.member.communities.reports.reviews.create(
      connection,
      {
        body: prepared,
        communityId: props.params.communityId,
        reportId: props.params.reportId,
      },
    );
  return result;
}
