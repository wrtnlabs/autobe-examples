import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_system_setting(
  input?: DeepPartial<IRedditCommunitySystemSetting.ICreate> | undefined,
): IRedditCommunitySystemSetting.ICreate {
  return {
    key: input?.key ?? RandomGenerator.alphaNumeric(12),
    value: input?.value ?? RandomGenerator.alphaNumeric(20),
    description:
      input?.description ??
      (Math.random() > 0.5
        ? null
        : RandomGenerator.paragraph({ sentences: 2 })),
  };
}
