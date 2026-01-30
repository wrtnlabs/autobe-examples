import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsCommentReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReportStatus";
import { prepare_random_community_bbs_comment_report_status } from "../prepare/prepare_random_community_bbs_comment_report_status";
export async function generate_random_community_bbs_moderator_comment_report_statuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsCommentReportStatus.ICreate> | undefined;
  },
): Promise<ICommunityBbsCommentReportStatus> {
  const prepared: ICommunityBbsCommentReportStatus.ICreate =
    prepare_random_community_bbs_comment_report_status(props.body);
  const result: ICommunityBbsCommentReportStatus =
    await api.functional.communityBbs.moderator.comment_report_statuses.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
