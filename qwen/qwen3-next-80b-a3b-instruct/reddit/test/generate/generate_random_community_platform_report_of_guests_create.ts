import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformReportOfGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfGuest";
import { prepare_random_community_platform_report_of_guest } from "../prepare/prepare_random_community_platform_report_of_guest";
export async function generate_random_community_platform_report_of_guests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformReportOfGuest.ICreate>;
  },
): Promise<ICommunityPlatformReportOfGuest> {
  const prepared: ICommunityPlatformReportOfGuest.ICreate =
    prepare_random_community_platform_report_of_guest(props.body);
  const result: ICommunityPlatformReportOfGuest =
    await api.functional.communityPlatform.report.of.guests.create(connection, {
      body: prepared,
    });
  return result;
}
