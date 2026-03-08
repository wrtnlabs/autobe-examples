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

/**
 * Test member login is rejected when account is banned.
 *
 * This test validates that banned users cannot authenticate even with correct credentials.
 * The system should query the user, check isBanned flag, and reject with 401 Unauthorized.
 */
export async function test_api_member_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberBio = RandomGenerator.paragraph({ sentences: 2 });
  const memberHref = typia.random<string & tags.Format<"uri">>();
  const memberReferrer = typia.random<string & tags.Format<"uri">>();
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: memberDisplayName,
      bio: memberBio,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberResult);
  // 2. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = RandomGenerator.alphaNumeric(16) satisfies string as string;
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminResult);
  // 3. Ban the member using admin
  const banReason =
    "Violation of community guidelines - testing banned account scenario";
  const banRecord =
    await generate_random_economic_political_board_admin_ban_records_create(
      adminConnection,
      {
        body: {
          user_id: memberResult.id,
          reason: banReason,
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Attempt login with banned member credentials - should fail with 401
  await TestValidator.httpError(
    "banned member should not be able to login",
    [401],
    async () => {
      const loginResult = await authorize_member_login(memberConnection, {
        body: {
          email: memberEmail,
          password: memberPassword,
        } satisfies IEconomicPoliticalBoardMember.ILogin,
      });
      typia.assert(loginResult);
    },
  );
}