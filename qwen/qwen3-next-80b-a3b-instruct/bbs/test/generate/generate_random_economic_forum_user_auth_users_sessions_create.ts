import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserSession";
import { prepare_random_economic_forum_user_session } from "../prepare/prepare_random_economic_forum_user_session";
export async function generate_random_economic_forum_user_auth_users_sessions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumUserSession.ICreate>;
  },
): Promise<IEconomicForumUserSession> {
  const prepared: IEconomicForumUserSession.ICreate =
    prepare_random_economic_forum_user_session(props.body);
  return await api.functional.economicForum.user.auth.users.sessions.create(
    connection,
    {
      body: prepared,
    },
  );
}
