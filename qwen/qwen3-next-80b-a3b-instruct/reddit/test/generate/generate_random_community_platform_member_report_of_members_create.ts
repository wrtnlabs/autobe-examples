import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMember";
import { prepare_random_community_platform_report_of_member } from "../prepare/prepare_random_community_platform_report_of_member";
export async function generate_random_community_platform_member_report_of_members_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportOfMember.ICreate>;
  },
): Promise<ICommunityPlatformReportOfMember> {
  const prepared: ICommunityPlatformReportOfMember.ICreate =
    prepare_random_community_platform_report_of_member(props.body);
  const result: ICommunityPlatformReportOfMember =
    await api.functional.communityPlatform.member.report.of.members.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
