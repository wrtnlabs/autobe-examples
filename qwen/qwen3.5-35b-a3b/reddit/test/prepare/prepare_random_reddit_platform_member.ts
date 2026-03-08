import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_platform_member(
  input?: DeepPartial<IRedditPlatformMember.ICreate>,
): IRedditPlatformMember.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      input?.password ??
      typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    username: input?.username ?? RandomGenerator.alphaNumeric(12),
    displayName: input?.displayName ?? RandomGenerator.name(),
    bio: input?.bio ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
