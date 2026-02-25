import { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_activity_log(
  input?: DeepPartial<ICommunityPlatformActivityLog.ICreate>,
): ICommunityPlatformActivityLog.ICreate {
  return {
    user_id:
      input?.user_id ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"uuid">>(),
      ]),
    action_type:
      input?.action_type ??
      RandomGenerator.pick([
        "login",
        "logout",
        "post_create",
        "post_edit",
        "post_delete",
        "comment_create",
        "comment_edit",
        "comment_delete",
        "user_signup",
        "user_password_change",
        "community_create",
        "subscription_add",
        "subscription_remove",
        "moderator_add",
        "moderator_remove",
        "user_ban",
        "user_unban",
      ]),
    ip_address:
      input?.ip_address ??
      RandomGenerator.pick([
        null,
        typia.random<string & tags.Format<"ipv4">>(),
      ]),
    user_agent:
      input?.user_agent ??
      RandomGenerator.pick([
        null,
        RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 10 }),
      ]),
    metadata:
      input?.metadata ??
      RandomGenerator.pick([
        null,
        JSON.stringify({
          key: RandomGenerator.alphabets(5),
          value: RandomGenerator.paragraph({ sentences: 1 }),
        }),
      ]),
  };
}
