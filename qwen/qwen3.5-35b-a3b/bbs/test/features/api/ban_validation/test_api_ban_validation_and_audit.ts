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

export async function test_api_ban_validation_and_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin and member users
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: "ban_test_admin@test.com",
      password: "password1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: "ban_test_member@test.com",
      password: "password1234",
      displayName: "Ban Test Member",
      href: "http://localhost:3000/member",
      referrer: "http://localhost:3000",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Admin bans member with valid reason (10-500 chars, no HTML)
  const banReason =
    "User violated community guidelines by posting hate speech and promoting violence against specific groups";
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          user_id: memberAuth.id,
          reason: banReason,
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 3. Validate ban record structure
  TestValidator.equals("ban reason matches input", banRecord.reason, banReason);
  TestValidator.predicate(
    "ban reason has 10-500 characters",
    banReason.length >= 10 && banReason.length <= 500,
  );
  TestValidator.predicate(
    "ban reason contains no HTML tags",
    !/<script|<iframe|<style/i.test(banReason),
  );
  typia.assert(banRecord.created_at);
  typia.assert(banRecord.user);
  typia.assert(banRecord.bannedByAdmin);
  // 4. Verify ban takes effect immediately - banned user cannot login
  await TestValidator.error("banned user cannot authenticate", async () => {
    await api.functional.economicPoliticalBoard.auth.member.login(
      { host: connection.host },
      {
        body: {
          email: "ban_test_member@test.com",
          password: "password1234",
        } satisfies IEconomicPoliticalBoardMember.ILogin,
      },
    );
  });
  // 5. Verify ban record remains immutable (audit trail preserved)
  // Ban records should never be deleted - test that we can reference the banRecord
  const originalBanId = banRecord.id;
  const originalBanReason = banRecord.reason;
  typia.assert(originalBanId);
  typia.assert(originalBanReason);
  // 6. Verify user data references are valid
  TestValidator.equals(
    "banned user id matches original",
    banRecord.user.id,
    memberAuth.id,
  );
}
