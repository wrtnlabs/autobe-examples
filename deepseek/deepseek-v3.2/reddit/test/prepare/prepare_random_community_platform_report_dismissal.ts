import { ICommunityPlatformReportDismissal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDismissal";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report_dismissal(
  input?: DeepPartial<ICommunityPlatformReportDismissal.ICreate> | undefined,
): ICommunityPlatformReportDismissal.ICreate {
  return {
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      }),
  };
}
