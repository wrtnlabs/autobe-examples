import { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_user_email_verification(
  input?: DeepPartial<ICommunityPlatformUserEmailVerification.ICreate>,
): ICommunityPlatformUserEmailVerification.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
    is_verified: input?.is_verified ?? false,
    expires_at:
      input?.expires_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
