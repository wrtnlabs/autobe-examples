import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformLoginAttempt";
export function prepare_random_reddit_platform_login_attempt(
  input?: DeepPartial<IRedditPlatformLoginAttempt.ICreate>,
): IRedditPlatformLoginAttempt.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password: input?.password ?? RandomGenerator.alphaNumeric(16),
    href:
      input?.href ??
      `https://example.com/page/${RandomGenerator.alphaNumeric(8)}`,
    referrer:
      input?.referrer ??
      `https://example.com/previous-page/${RandomGenerator.alphaNumeric(8)}`,
    ip:
      input?.ip ??
      typia.random<
        string &
          tags.Pattern<"^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$">
      >(),
  };
}
