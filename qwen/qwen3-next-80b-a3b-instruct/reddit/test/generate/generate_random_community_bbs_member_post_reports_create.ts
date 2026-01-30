import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsPostReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostReport";
import { prepare_random_community_bbs_post_report } from "../prepare/prepare_random_community_bbs_post_report";
export async function generate_random_community_bbs_member_post_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsPostReport.ICreate>;
  },
): Promise<void> {
  const prepared: ICommunityBbsPostReport.ICreate =
    prepare_random_community_bbs_post_report(props.body);
  return await api.functional.communityBbs.member.post_reports.create(
    connection,
    {
      body: prepared,
    },
  );
}
