import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_reddit_community_ban(
  input?: DeepPartial<IRedditCommunityBan.ICreate> | undefined,
): IRedditCommunityBan.ICreate {
  return {
    user_id: input?.user_id ?? typia.random<string & tags.Format<"uuid">>(),
    expires_at:
      input?.expires_at ??
      (typia.random<number>() > 0.5
        ? new Date(
            Date.now() +
              Math.floor(
                Math.random() * (365 * 24 * 60 * 60 * 1000) +
                  7 * 24 * 60 * 60 * 1000,
              ),
          ).toISOString()
        : null),
    reason:
      input?.reason ??
      RandomGenerator.paragraph({
        sentences: 1 + Math.floor(Math.random() * 2),
      }),
  };
}
