import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
export function prepare_random_discussion_board_configuration(
  input?: DeepPartial<IDiscussionBoardConfiguration.ICreate>,
): IDiscussionBoardConfiguration.ICreate {
  return {
    postPerDayLimit:
      input?.postPerDayLimit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
      >(),
    attachmentFileSizeLimit:
      input?.attachmentFileSizeLimit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20971520>
      >(),
    trustScoreThreshold:
      input?.trustScoreThreshold ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
      >(),
    reactionButtonLimit:
      input?.reactionButtonLimit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5>
      >(),
    commentPerPageLimit:
      input?.commentPerPageLimit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<50>
      >(),
    postContentMaxLength:
      input?.postContentMaxLength ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10000>
      >(),
    notificationDeliveryDelay:
      input?.notificationDeliveryDelay ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<60000>
      >(),
    restoreAgeLimitDays:
      input?.restoreAgeLimitDays ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<365>
      >(),
    moderationQueueTimeLimit:
      input?.moderationQueueTimeLimit ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1440>
      >(),
    reportAggregationThreshold:
      input?.reportAggregationThreshold ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
      >(),
    maxAttachmentsPerPost:
      input?.maxAttachmentsPerPost ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<10>
      >(),
  };
}
