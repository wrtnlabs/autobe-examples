import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";
export function prepare_random_discussion_board_member_session(
  input?: DeepPartial<IDiscussionBoardMemberSession.ICreate>,
): IDiscussionBoardMemberSession.ICreate {
  return {
    userAgent:
      input?.userAgent ??
      RandomGenerator.pick([
        "Chrome",
        "Firefox",
        "Safari",
        "Edge",
        "Brave",
        "Opera",
      ]) +
        " " +
        `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<150>>().toString()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>>().toString()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>>().toString()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<99>>().toString()}` +
        " on " +
        RandomGenerator.pick(["Windows", "macOS", "iOS", "Android", "Linux"]) +
        " " +
        `${typia.random<number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<20>>().toString()}.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<9>>()}` +
        " (" +
        RandomGenerator.name(1) +
        ")",
    ip: input?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    expires_at:
      input?.expires_at ??
      new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24).toISOString(),
  };
}
