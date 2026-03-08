import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardBanRecord";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_admin_ban_records_create } from "../../../generate/generate_random_economic_political_board_admin_ban_records_create";
import { prepare_random_economic_political_board_ban_record } from "../../../prepare/prepare_random_economic_political_board_ban_record";

export async function test_api_admin_registration_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a regular member account and track the email
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult =
    await api.functional.economicPoliticalBoard.auth.member.join(
      memberConnection,
      {
        body: {
          email: memberEmail satisfies string as string,
          password: memberPassword,
          displayName: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEconomicPoliticalBoardMember.IJoin,
      },
    );
  typia.assert(memberJoinResult);
  // 2. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  // 3. Ban the member user
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          user_id: memberJoinResult.id,
          reason:
            "Violating community guidelines by posting prohibited content repeatedly.",
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Attempt admin registration with banned user's credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: memberEmail satisfies string as string,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconomicPoliticalBoardAdmin.IJoin;
  // Verify banned user cannot register as admin
  await TestValidator.error(
    "banned user cannot register as admin",
    async () => {
      await api.functional.economicPoliticalBoard.auth.admin.join(
        adminJoinConnection,
        { body: adminJoinBody },
      );
    },
  );
}