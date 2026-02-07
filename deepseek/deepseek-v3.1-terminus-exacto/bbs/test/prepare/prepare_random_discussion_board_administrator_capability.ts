import { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_administrator_capability(
  input?:
    | DeepPartial<IDiscussionBoardAdministratorCapability.ICreate>
    | undefined,
): IDiscussionBoardAdministratorCapability.ICreate {
  return {
    capability_type:
      input?.capability_type ??
      RandomGenerator.pick([
        "content_moderation",
        "user_management",
        "section_admin",
        "system_config",
      ] as const),
    permission_level:
      input?.permission_level ??
      RandomGenerator.pick([
        "read_only",
        "full_access",
        "limited_scope",
      ] as const),
  };
}
