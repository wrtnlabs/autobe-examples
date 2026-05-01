import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_hub_comment(
  input?: DeepPartial<ICommunityHubComment.ICreate> | undefined,
): ICommunityHubComment.ICreate {
  return {
    content: input?.content ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
