import { ICommunityPlatformReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_snapshot(
  input?: DeepPartial<ICommunityPlatformReportSnapshot.ICreate>,
): ICommunityPlatformReportSnapshot.ICreate {
  return {
    snapshot_reason:
      input?.snapshot_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
    snapshot_status: input?.snapshot_status ?? RandomGenerator.name(2),
    community_platform_report_resolution_id:
      input?.community_platform_report_resolution_id ??
      (input?.community_platform_report_resolution_id === null
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    snapshot_decisioned_at:
      input?.snapshot_decisioned_at ??
      (input?.snapshot_decisioned_at === null
        ? null
        : RandomGenerator.date(
            new Date(),
            1000 * 60 * 60 * 24 * 30,
          ).toISOString()),
  };
}
