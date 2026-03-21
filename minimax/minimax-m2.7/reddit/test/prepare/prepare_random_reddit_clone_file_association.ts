import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_clone_file_association(
  input?: DeepPartial<IRedditCloneFileAssociation.ICreate>,
): IRedditCloneFileAssociation.ICreate {
  return {
    redditCloneFileId:
      input?.redditCloneFileId ?? typia.random<string & tags.Format<"uuid">>(),
    targetId: input?.targetId ?? typia.random<string & tags.Format<"uuid">>(),
    targetType:
      input?.targetType ??
      RandomGenerator.pick(["user", "community", "post"] as const),
  };
}
