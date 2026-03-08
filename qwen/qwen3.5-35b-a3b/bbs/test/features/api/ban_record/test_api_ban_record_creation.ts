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

export async function test_api_ban_record_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user with stored credentials
  const adminEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminBio = RandomGenerator.paragraph({ sentences: 2 });
  const adminHref = typia.random<
    string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<512>
  >();
  const adminReferrer = typia.random<
    string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<512>
  >();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    },
  });
  typia.assert(adminAuth);
  // 2. Create member user with stored credentials
  const memberEmail = typia.random<
    string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
  >();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  const memberBio = RandomGenerator.paragraph({ sentences: 2 });
  const memberHref = typia.random<
    string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<512>
  >();
  const memberReferrer = typia.random<
    string & tags.Format<"uri"> & tags.MinLength<1> & tags.MaxLength<512>
  >();
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: memberDisplayName,
      bio: memberBio,
      href: memberHref,
      referrer: memberReferrer,
    },
  });
  typia.assert(memberAuth);
  // 3. Log in as admin to get admin connection for ban operation
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    },
  });
  // 4. Submit ban request using admin connection
  const banReason = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 2,
    sentenceMax: 4,
  }) satisfies string as string & tags.MinLength<10> & tags.MaxLength<500>;
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminLoginConnection,
      {
        body: {
          user_id: memberAuth.id,
          reason: banReason,
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Validate ban record structure
  TestValidator.equals(
    "user_id matches member id",
    banRecord.user.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "banned_by_admin_id matches admin id",
    banRecord.bannedByAdmin.id,
    adminAuth.id,
  );
  TestValidator.equals("reason matches request", banRecord.reason, banReason);
  TestValidator.predicate(
    "created_at is valid date-time",
    new Date(banRecord.created_at).toISOString() !== "Invalid Date",
  );
  // 6. Validate user summary in ban record (ISummary only has id, no email/displayName)
  TestValidator.equals(
    "banned user id matches",
    banRecord.user.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "bannedByAdmin id matches",
    banRecord.bannedByAdmin.id,
    adminAuth.id,
  );
  // 7. Attempt to login as banned member - should fail with 401
  await TestValidator.error("banned member cannot login", async () => {
    const bannedMemberLoginConnection: api.IConnection = {
      host: connection.host,
    };
    await authorize_member_login(bannedMemberLoginConnection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      },
    });
  });
}
