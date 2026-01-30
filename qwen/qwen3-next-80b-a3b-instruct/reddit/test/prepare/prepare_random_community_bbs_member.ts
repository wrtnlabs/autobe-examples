import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
export function prepare_random_community_bbs_member(
  input?: DeepPartial<ICommunityBbsMember.ICreate>,
): ICommunityBbsMember.ICreate {
  return {
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    password: input?.password ?? RandomGenerator.alphaNumeric(16),
    href: input?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer: input?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  };
}
