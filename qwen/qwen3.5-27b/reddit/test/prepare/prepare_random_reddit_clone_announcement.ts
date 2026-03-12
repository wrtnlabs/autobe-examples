import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAnnouncement";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_announcement(
  input?: DeepPartial<IRedditCloneAnnouncement.ICreate> | undefined,
): IRedditCloneAnnouncement.ICreate {
  const visibilityScope =
    input?.visibilityScope ??
    RandomGenerator.pick(["platform-wide", "community", "user-group"] as const);
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 3,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    visibilityScope: visibilityScope,
    communities:
      input?.communities ??
      (visibilityScope === "community"
        ? ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<3>
            >(),
            () => typia.random<string & tags.Format<"uuid">>(),
          )
        : undefined),
    userGroups:
      input?.userGroups ??
      (visibilityScope === "user-group"
        ? ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<2>
            >(),
            () => RandomGenerator.alphaNumeric(8),
          )
        : undefined),
    scheduledDeliveryTime:
      input?.scheduledDeliveryTime ??
      typia.random<string & tags.Format<"date-time">>(),
  };
}
