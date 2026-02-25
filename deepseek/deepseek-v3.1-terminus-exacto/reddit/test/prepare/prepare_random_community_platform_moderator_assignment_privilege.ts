import { ICommunityPlatformModeratorAssignmentPrivilege } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorAssignmentPrivilege";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_moderator_assignment_privilege(
  input?: DeepPartial<ICommunityPlatformModeratorAssignmentPrivilege.ICreate>,
): ICommunityPlatformModeratorAssignmentPrivilege.ICreate {
  return {
    privilege_type: input?.privilege_type ?? RandomGenerator.name(2),
  };
}
