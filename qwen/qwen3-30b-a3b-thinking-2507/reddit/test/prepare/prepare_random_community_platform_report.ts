import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_report(
  input?: DeepPartial<ICommunityPlatformReport.ICreate> | undefined,
): ICommunityPlatformReport.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number>() satisfies number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>,
      }),
  };
}