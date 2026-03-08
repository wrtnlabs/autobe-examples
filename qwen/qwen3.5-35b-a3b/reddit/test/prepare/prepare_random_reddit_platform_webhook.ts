import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformWebhook";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_webhook(
  input?: DeepPartial<IRedditPlatformWebhook.ICreate> | undefined,
): IRedditPlatformWebhook.ICreate {
  const SUPPORTED_EVENT_TYPES = [
    "post.created",
    "post.deleted",
    "comment.created",
    "comment.deleted",
    "vote.applied",
    "community.created",
    "community.subscription_added",
    "report.created",
  ] as const;
  const eventCount = input?.eventTypes?.length
    ? input.eventTypes.length
    : typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<8>
      >();
  return {
    endpointUrl:
      input?.endpointUrl ?? typia.random<string & tags.Format<"uri">>(),
    eventTypes: input?.eventTypes
      ? input.eventTypes.map(
          (event) => event ?? RandomGenerator.pick(SUPPORTED_EVENT_TYPES),
        )
      : ArrayUtil.repeat(eventCount, () =>
          RandomGenerator.pick(SUPPORTED_EVENT_TYPES),
        ),
  };
}
