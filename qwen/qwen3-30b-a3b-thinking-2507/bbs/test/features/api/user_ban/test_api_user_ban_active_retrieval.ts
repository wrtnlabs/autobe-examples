import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import type { IEconomyPoliticsBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_economy_politics_board_admin_users_bans_create } from "../../../generate/generate_random_economy_politics_board_admin_users_bans_create";
import { prepare_random_economy_politics_board_user_ban } from "../../../prepare/prepare_random_economy_politics_board_user_ban";

/*
 * Test active ban retrieval for a user.
 * 1. Admin authentication
 * 2. Create ban with valid reason (min 10 char), valid expiration
 * 3. Retrieve ban record
 * 4. Validate required details
 */
export async function test_api_user_ban_active_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secure_password_123",
      href: "https://example.com/join",
      referrer: "https://example.com/register",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // User ID for ban
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Create ban with valid reason (min 10 characters)
  const createdBan =
    await generate_random_economy_politics_board_admin_users_bans_create(
      adminConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expire_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies IEconomyPoliticsBoardUserBan.ICreate,
        params: { userId },
      },
    );
  typia.assert(createdBan);
  // Retrieve ban
  const retrievedBan =
    await api.functional.economyPoliticsBoard.admin.users.bans.at(
      adminConnection,
      {
        userId,
        banId: createdBan.id,
      },
    );
  typia.assert(retrievedBan);
  // Verify required details
  TestValidator.equals(
    "ban reason length >= 10",
    createdBan.reason.length,
    10
  );
  TestValidator.predicate("start_at valid", retrievedBan.start_at !== null);
  TestValidator.predicate(
    "expire_at defined for active ban",
    retrievedBan.expire_at !== null,
  );
  TestValidator.predicate(
    "admin reference present",
    retrievedBan.admin !== null,
  );
  TestValidator.equals("ban ID matches", retrievedBan.id, createdBan.id);
}