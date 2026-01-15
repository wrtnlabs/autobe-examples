import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformEmailNotificationQueue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEmailNotificationQueue";
export function prepare_random_community_platform_email_notification_queue(
  input?: DeepPartial<ICommunityPlatformEmailNotificationQueue.ICreate>,
): ICommunityPlatformEmailNotificationQueue.ICreate {
  return {
    recipient_email:
      input?.recipient_email ?? typia.random<string & tags.Format<"email">>(),
    subject:
      input?.subject ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>
        >(),
      }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
      }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "normal", "high"] as const),
    retry_count:
      input?.retry_count ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
      >(),
  };
}
