import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_moderator_assignment(
  input?: DeepPartial<IRedditCloneModeratorAssignment.ICreate> | undefined,
): IRedditCloneModeratorAssignment.ICreate {
  return {
    appointedActorId:
      input?.appointedActorId ?? typia.random<string & tags.Format<"uuid">>(),
    appointingActorId:
      input?.appointingActorId ?? typia.random<string & tags.Format<"uuid">>(),
    communityId:
      input?.communityId ?? typia.random<string & tags.Format<"uuid">>(),
    role: input?.role ?? RandomGenerator.pick(["moderator", "owner"] as const),
  };
}
