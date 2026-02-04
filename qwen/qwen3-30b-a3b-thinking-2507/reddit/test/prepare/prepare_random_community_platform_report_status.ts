import { ICommunityPlatformReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_status(
  input?: DeepPartial<ICommunityPlatformReportStatus.ICreate>,
): ICommunityPlatformReportStatus.ICreate {
  return {};
}
