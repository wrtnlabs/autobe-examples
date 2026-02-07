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

export async function test_api_user_ban_removal_with_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test_password",
      href: "http://example.com",
      referrer: "http://example.com",
    } satisfies IEconomyPoliticsBoardAdmin.IJoin,
  });
  // 2. Create a user ID
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a valid ban reason (min 10 characters)
  let banReason = RandomGenerator.paragraph({ sentences: 1 });
  while (banReason.length < 10) {
    banReason += RandomGenerator.paragraph({ sentences: 1 });
  }
  // Create the ban using the utility function
  const createdBan: IEconomyPoliticsBoardUserBan =
    await generate_random_economy_politics_board_admin_users_bans_create(
      adminConnection,
      {
        body: {
          reason: banReason,
        } satisfies IEconomyPoliticsBoardUserBan.ICreate,
        params: { userId },
      },
    );
  // Verify the reason length is at least 10 (as per requirement)
  TestValidator.predicate(
    "Reason should be at least 10 characters",
    banReason.length >= 10,
  );
  TestValidator.equals("Reason should match", createdBan.reason, banReason);
  // 4. Remove the ban
  const deletedBan: IEconomyPoliticsBoardUserBan =
    await api.functional.economyPoliticsBoard.admin.users.bans.erase(
      adminConnection,
      {
        userId,
        banId: createdBan.id,
      },
    );
  typia.assert(deletedBan);
  // 5. Validate the ban details were correct before deletion
  TestValidator.equals(
    "Deleted ban ID should match",
    deletedBan.id,
    createdBan.id,
  );
  TestValidator.equals(
    "Deleted ban reason should match",
    deletedBan.reason,
    createdBan.reason,
  );
  TestValidator.predicate(
    "deleted_at should be present",
    !!deletedBan.deleted_at,
  );
}
