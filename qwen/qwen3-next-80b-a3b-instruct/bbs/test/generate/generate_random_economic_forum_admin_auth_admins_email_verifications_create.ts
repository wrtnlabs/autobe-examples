import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEconomicForumEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumEmailVerification";
import { prepare_random_economic_forum_email_verification } from "../prepare/prepare_random_economic_forum_email_verification";
export async function generate_random_economic_forum_admin_auth_admins_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumEmailVerification.ICreate>;
  },
): Promise<IEconomicForumEmailVerification> {
  const prepared: IEconomicForumEmailVerification.ICreate =
    prepare_random_economic_forum_email_verification(props.body);
  const result: IEconomicForumEmailVerification =
    await api.functional.economicForum.admin.auth.admins.email.verifications.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
