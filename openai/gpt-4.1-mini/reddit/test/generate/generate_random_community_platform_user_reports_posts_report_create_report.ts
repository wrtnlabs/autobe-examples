import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_report } from "../prepare/prepare_random_community_platform_post_report";

export async function generate_random_community_platform_user_reports_posts_report_create_report(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostReport.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostReport> {
  const prepared: ICommunityPlatformPostReport.ICreate =
    prepare_random_community_platform_post_report(props.body);
  const result: ICommunityPlatformPostReport =
    await api.functional.communityPlatform.user.reports.posts.report.createReport(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
      },
    );
  return result;
}
