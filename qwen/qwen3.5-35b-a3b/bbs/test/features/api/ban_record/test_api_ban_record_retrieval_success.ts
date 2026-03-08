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

export async function test_api_ban_record_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration - store email for later login
  const adminEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  // 2. Member registration - store email for later validation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberDisplayName = RandomGenerator.name();
  const memberBio = RandomGenerator.paragraph({ sentences: 2 });
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: RandomGenerator.alphaNumeric(16),
      displayName: memberDisplayName,
      bio: memberBio,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 3. Admin login to get fresh connection for admin operations
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 4. Admin creates ban record for the member
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminLoginConnection,
      {
        body: {
          user_id: memberJoinResult.id,
          reason: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(banRecord);
  // 5. Retrieve ban record using admin connection
  const retrieveConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(retrieveConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  const retrievedBanRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.at(
      retrieveConnection,
      {
        banRecordId: banRecord.id,
      },
    );
  typia.assert(retrievedBanRecord);
  // 6. Validate ban record structure and data
  TestValidator.equals("ban record id", retrievedBanRecord.id, banRecord.id);
  TestValidator.equals(
    "ban reason",
    retrievedBanRecord.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "ban record created_at",
    retrievedBanRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "banned user id",
    retrievedBanRecord.user.id,
    memberJoinResult.id,
  );
}
