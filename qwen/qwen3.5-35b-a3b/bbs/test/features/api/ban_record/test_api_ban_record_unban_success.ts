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

export async function test_api_ban_record_unban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<2048> &
        tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<2048> &
        tags.Format<"uri">,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Setup: Create member user who will be banned
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Ban the member
  const banRecord =
    await api.functional.economicPoliticalBoard.admin.ban_records.create(
      adminConnection,
      {
        body: {
          user_id: memberAuth.id,
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 2,
            sentenceMax: 4,
          })
            .slice(0, 500)
            .padEnd(10, "x") satisfies string as string &
            tags.MinLength<10> &
            tags.MaxLength<500>,
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Unban the member with the ban record ID
  const banRecordId = typia.random<number & tags.Type<"int32">>();
  const unbanResponse =
    await api.functional.economicPoliticalBoard.admin.ban_records.unban(
      adminConnection,
      { banRecordId },
    );
  typia.assert(unbanResponse);
  // 5. Verify ban record maintains original data after unban
  TestValidator.equals(
    "ban record reason preserved",
    unbanResponse.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "ban record user_id preserved",
    unbanResponse.user_id,
    banRecord.user.userId,
  );
  TestValidator.equals(
    "ban record banned_by_admin_id preserved",
    unbanResponse.banned_by_admin_id,
    banRecord.bannedByAdmin.id,
  );
  // 6. Verify user can log in after unban (proves isBanned is false)
  const reAuth = await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(reAuth);
  // 7. Verify unban response has expected structure
  TestValidator.equals(
    "unban user has correct id",
    unbanResponse.user.id,
    memberAuth.id,
  );
}
