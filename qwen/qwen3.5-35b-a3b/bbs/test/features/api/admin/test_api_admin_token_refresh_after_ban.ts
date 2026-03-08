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
import { generate_random_economic_political_board_admin_ban_records_create } from "../../../generate/generate_random_economic_political_board_admin_ban_records_create";
import { prepare_random_economic_political_board_ban_record } from "../../../prepare/prepare_random_economic_political_board_ban_record";

export async function test_api_admin_token_refresh_after_ban(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first admin (target of ban)
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Authorized = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin1Authorized);
  // 2. Create second admin (super admin who will ban)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Authorized = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>() satisfies string as string,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>() satisfies string as string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string as string,
    } satisfies IEconomicPoliticalBoardAdmin.IJoin,
  });
  typia.assert(admin2Authorized);
  // 3. Create ban record for admin1 using admin2's connection
  const banRecord =
    await generate_random_economic_political_board_admin_ban_records_create(
      admin2Connection,
      {
        body: {
          user_id: admin1Authorized.id,
          reason: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IEconomicPoliticalBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Verify ban record is valid
  typia.assert(banRecord);
  // 5. Attempt to refresh admin1's token (should fail with 403)
  // Use SDK directly without authorize_admin_refresh wrapper
  await TestValidator.httpError(
    "token refresh should fail for banned user",
    403,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await api.functional.economicPoliticalBoard.auth.admin.refresh(
        refreshConnection,
        {
          body: {
            refresh_token: admin1Authorized.token.refresh,
          } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
        },
      );
    },
  );
  // 6. Verify that admin1 cannot continue using their previous tokens
  await TestValidator.httpError(
    "admin1 should not be able to use refresh token after ban",
    403,
    async () => {
      const testConnection: api.IConnection = { host: connection.host };
      await api.functional.economicPoliticalBoard.auth.admin.refresh(
        testConnection,
        {
          body: {
            refresh_token: admin1Authorized.token.refresh,
          } satisfies IEconomicPoliticalBoardAdmin.IRefresh,
        },
      );
    },
  );
}