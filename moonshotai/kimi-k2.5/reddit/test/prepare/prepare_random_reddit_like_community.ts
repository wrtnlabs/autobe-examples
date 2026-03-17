import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_like_community(
  input?: DeepPartial<IRedditLikeCommunity.ICreate>,
): IRedditLikeCommunity.ICreate {
  return {
    name: input?.name ?? RandomGenerator.alphaNumeric(20),
    description:
      input?.description ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 15 }),
    iconAttachmentId: input?.iconAttachmentId ?? null,
  };
}
