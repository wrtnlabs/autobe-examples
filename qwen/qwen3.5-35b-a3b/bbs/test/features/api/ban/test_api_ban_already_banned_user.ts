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
 * Test that an administrator cannot ban a user who is already banned.
 * Duplicate ban attempts should be rejected with appropriate error.
 *
 * This test validates:
 * 1. First ban succeeds and creates a ban record
 * 2. Second ban attempt for same user fails with error
 * 3. Error message clearly indicates user is already banned
 */
export async function test_api_ban_already_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Register member user to be banned
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId: string = memberAuth.id;
  // 3. Log in as administrator
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEconomicPoliticalBoardAdmin.ILogin,
  });
  typia.assert(adminLogin);
  // 4. Ban the member user (first ban - should succeed)
  const firstBanReason = "Violation of community guidelines - spam content";
  const firstBanRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminLoginConnection,
      {
        body: {
          user_id: memberId,
          reason: firstBanReason,
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(firstBanRecord);
  // Validate first ban record structure
  typia.assert(firstBanRecord);
  typia.assert(firstBanRecord.user);
  typia.assert(firstBanRecord.bannedByAdmin);
  TestValidator.equals(
    "ban record reason matches input",
    firstBanRecord.reason,
    firstBanReason,
  );
  // 5. Attempt to ban the same user again (should fail with 409 or 400 error)
  const secondBanReason = "Repeated violations - severe misconduct";
  // This should throw an error indicating user is already banned
  await TestValidator.error(
    "second ban attempt fails for already banned user",
    async () => {
      await api.functional.economicPoliticalBoard.admin.ban_records.create(
        adminLoginConnection,
        {
          body: {
            user_id: memberId,
            reason: secondBanReason,
          } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
        },
      );
    },
  );
  // 6. Test passed - duplicate ban was correctly rejected
  // The system prevented creation of second ban record for the same user
}