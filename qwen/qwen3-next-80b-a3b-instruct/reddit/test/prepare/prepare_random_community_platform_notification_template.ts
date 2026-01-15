import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationTemplate";
export function prepare_random_community_platform_notification_template(
  input?: DeepPartial<ICommunityPlatformNotificationTemplate.ICreate>,
): ICommunityPlatformNotificationTemplate.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.alphabets(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<255>
        >(),
      ),
    subject:
      input?.subject ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    body:
      input?.body ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        sentenceMin: 5,
        sentenceMax: 10,
        wordMin: 4,
        wordMax: 8,
      }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high"] as const),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
    tags: input?.tags
      ? input.tags.map((tag) => tag)
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
          >(),
          () =>
            RandomGenerator.alphabets(
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<1> &
                  tags.Maximum<100>
              >(),
            ),
        ),
  };
}
