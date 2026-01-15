import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformReportOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfMember";
export function prepare_random_community_platform_report_of_member(
  input?: DeepPartial<ICommunityPlatformReportOfMember.ICreate>,
): ICommunityPlatformReportOfMember.ICreate {
  return {
    target_member_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.pick([
      "spam",
      "harassment",
      "inappropriate_content",
      "misinformation",
    ] as const),
    details:
      input?.details ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 10,
      }),
    evidence_urls: input?.evidence_urls
      ? input.evidence_urls.map((url) => url)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
          >(),
          () =>
            `https://${RandomGenerator.alphabets(typia.random<number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<12>>())}.com`,
        ),
  };
}
