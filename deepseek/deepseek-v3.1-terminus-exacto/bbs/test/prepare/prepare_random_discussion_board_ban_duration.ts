import { IDiscussionBoardBanDuration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanDuration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_ban_duration(
  input?: DeepPartial<IDiscussionBoardBanDuration.ICreate>,
): IDiscussionBoardBanDuration.ICreate {
  // Generate realistic ban duration options
  const is_permanent =
    input?.is_permanent ?? RandomGenerator.pick([true, false]);
  // Generate appropriate duration based on permanent flag
  const duration_hours =
    input?.duration_hours ??
    (is_permanent
      ? 0 // Permanent bans typically have 0 duration
      : typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<720>
        >()); // 1 hour to 30 days
  // Generate appropriate name based on duration
  const name =
    input?.name ??
    (() => {
      if (is_permanent) return "Permanent Ban";
      if (duration_hours === 1) return "1 Hour Ban";
      if (duration_hours === 24) return "1 Day Ban";
      if (duration_hours === 168) return "1 Week Ban";
      if (duration_hours === 720) return "30 Day Ban";
      return `${duration_hours} Hour Ban`;
    })();
  // Generate appropriate description
  const description =
    input?.description ??
    (() => {
      if (is_permanent) {
        return "This ban is permanent and cannot be appealed. The user will be permanently removed from the platform.";
      }
      return `Temporary ban lasting ${duration_hours} hours. The user will be unable to access the platform during this period.`;
    })();
  return {
    name,
    description,
    duration_hours,
    is_permanent,
  };
}
