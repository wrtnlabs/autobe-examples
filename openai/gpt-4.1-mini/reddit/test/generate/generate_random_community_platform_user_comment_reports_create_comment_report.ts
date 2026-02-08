import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_report } from "../prepare/prepare_random_community_platform_comment_report";

export async function generate_random_community_platform_user_comment_reports_create_comment_report(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentReport.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommentReport> {
  const prepared: ICommunityPlatformCommentReport.ICreate =
    prepare_random_community_platform_comment_report(props.body);
  const result: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.user.comment_reports.createCommentReport(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
