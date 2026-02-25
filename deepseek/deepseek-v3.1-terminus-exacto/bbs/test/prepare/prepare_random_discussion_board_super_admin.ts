import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_super_admin(
  input?: DeepPartial<IDiscussionBoardSuperAdmin.ICreate> | undefined,
): IDiscussionBoardSuperAdmin.ICreate {
  // Determine whether to assign to regular admin or super admin (mutually exclusive)
  const assignToRegularAdmin = Math.random() > 0.5;
  return {
    permission_level:
      input?.permission_level ??
      RandomGenerator.pick(["read", "write", "admin", "super_admin"] as const),
    admin_id: assignToRegularAdmin
      ? (input?.admin_id ?? typia.random<string & tags.Format<"uuid">>())
      : (input?.admin_id ?? null),
    super_admin_id: !assignToRegularAdmin
      ? (input?.super_admin_id ?? typia.random<string & tags.Format<"uuid">>())
      : (input?.super_admin_id ?? null),
  };
}
