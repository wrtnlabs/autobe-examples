import { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_target(
  input?: DeepPartial<ICommunityPlatformReportTarget.ICreate> | undefined,
): ICommunityPlatformReportTarget.ICreate {
  return {
    target_type: input?.target_type ?? RandomGenerator.name(2),
    target_id: input?.target_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
