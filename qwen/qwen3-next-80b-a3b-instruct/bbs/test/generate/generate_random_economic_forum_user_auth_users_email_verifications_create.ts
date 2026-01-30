import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUserEmailVerification";
import { prepare_random_economic_forum_user_email_verification } from "../prepare/prepare_random_economic_forum_user_email_verification";
export async function generate_random_economic_forum_user_auth_users_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumUserEmailVerification.ICreate>;
  },
): Promise<IEconomicForumUserEmailVerification> {
  const prepared: IEconomicForumUserEmailVerification.ICreate =
    prepare_random_economic_forum_user_email_verification(props.body);
  return await api.functional.economicForum.user.auth.users.email.verifications.create(
    connection,
    {
      body: prepared,
    },
  );
}
