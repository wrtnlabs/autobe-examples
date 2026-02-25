import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_report } from "../prepare/prepare_random_community_platform_comment_report";

export async function generate_random_community_platform_user_comment_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentReport.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommentReport> {
  const prepared: ICommunityPlatformCommentReport.ICreate =
    prepare_random_community_platform_comment_report(props.body);
  const result: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.user.commentReports.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
