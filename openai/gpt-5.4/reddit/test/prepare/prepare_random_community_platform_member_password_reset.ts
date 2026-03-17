import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_member_password_reset(
  input?: DeepPartial<ICommunityPlatformMemberPasswordReset.ICreate>,
): ICommunityPlatformMemberPasswordReset.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    href: input?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer: input?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: input?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  };
}
