import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserEmailVerification";
export function prepare_random_economic_forum_user_email_verification(
  input?: DeepPartial<IEconomicForumUserEmailVerification.ICreate>,
): IEconomicForumUserEmailVerification.ICreate {
  return {};
}
