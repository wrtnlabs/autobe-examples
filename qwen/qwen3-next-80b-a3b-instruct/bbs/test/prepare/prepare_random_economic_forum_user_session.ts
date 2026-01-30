import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserSession";
export function prepare_random_economic_forum_user_session(
  input?: DeepPartial<IEconomicForumUserSession.ICreate> | undefined,
): IEconomicForumUserSession.ICreate {
  return {};
}
