import { ICommunityPlatformReportResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportResolution";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_resolution(
  input?: DeepPartial<ICommunityPlatformReportResolution.ICreate> | undefined,
): ICommunityPlatformReportResolution.ICreate {
  return {
    resolution_decision:
      input?.resolution_decision ??
      RandomGenerator.pick(["approved", "dismissed"] as const),
    moderation_note:
      input?.moderation_note ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
