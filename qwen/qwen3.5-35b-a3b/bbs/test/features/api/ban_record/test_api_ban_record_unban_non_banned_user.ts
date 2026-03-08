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

export async function test_api_ban_record_unban_non_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminEmail = typia.random<
    string & tags.Format<"email">
  >() satisfies string as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const adminAuthorized = await authorize_admin_login(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(adminAuthorized);
  // 2. Member setup (not banned, no ban record exists)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "1234";
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuthorized);
  // 3. Attempt to unban with non-existent ban record ID
  const invalidBanRecordId = typia.random<number & tags.Type<"int32">>();
  await TestValidator.error(
    "should return 404 for non-existent ban record",
    async () => {
      await api.functional.economicPoliticalBoard.admin.ban_records.unban(
        adminConnection,
        { banRecordId: invalidBanRecordId },
      );
    },
  );
  // 4. Verify member can still login (never was banned)
  const memberAuthorizedAfter = await authorize_member_login(memberConnection, {
    body: { email: memberEmail, password: memberPassword },
  });
  typia.assert(memberAuthorizedAfter);
  TestValidator.predicate(
    "member can still login after failed unban attempt",
    memberAuthorizedAfter !== undefined,
  );
}
