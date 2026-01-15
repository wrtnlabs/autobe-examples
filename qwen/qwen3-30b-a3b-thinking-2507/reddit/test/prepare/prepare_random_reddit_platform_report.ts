import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";

export function prepare_random_reddit_platform_report(
  input?: DeepPartial<IRedditPlatformReport.ICreate>,
): IRedditPlatformReport.ICreate {
  return {
    content_type:
      input?.content_type ??
      RandomGenerator.pick([
        "Spam",
        "Hate Speech",
        "Inappropriate Content",
      ] as const),
    described_content:
      input?.described_content ??
      RandomGenerator.paragraph({
        sentences: typia.random<number>(),
      }),
    target_content_id:
      input?.target_content_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}