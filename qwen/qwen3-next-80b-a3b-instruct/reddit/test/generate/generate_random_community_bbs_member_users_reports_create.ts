import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsUserReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserReport";
import { prepare_random_community_bbs_user_report } from "../prepare/prepare_random_community_bbs_user_report";
export async function generate_random_community_bbs_member_users_reports_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsUserReport.ICreate>;
  },
): Promise<ICommunityBbsUserReport> {
  const prepared: ICommunityBbsUserReport.ICreate =
    prepare_random_community_bbs_user_report(props.body);
  const result: ICommunityBbsUserReport =
    await api.functional.communityBbs.member.users.reports.create(connection, {
      body: prepared,
    });
  return result;
}
