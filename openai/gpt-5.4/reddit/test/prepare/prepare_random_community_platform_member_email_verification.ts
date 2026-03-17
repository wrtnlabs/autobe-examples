import { ICommunityPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_member_email_verification(
  input?: DeepPartial<ICommunityPlatformMemberEmailVerification.ICreate>,
): ICommunityPlatformMemberEmailVerification.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password:
      input?.password ?? typia.random<string & tags.Format<"password">>(),
    username: input?.username ?? RandomGenerator.alphabets(8),
  };
}
