import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_user_ban_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "admin123",
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(admin);
  // 2. Create regular user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "user123",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  const userToBan = await authorize_user_join(userConnection, {
    body: userCredentials,
  });
  typia.assert(userToBan);
  // 3. Create permanent ban record using utility function
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userToBan.id,
          banReason:
            "Permanent ban for violation of community guidelines" satisfies string &
              tags.MinLength<10>,
          banDurationType: "permanent" satisfies "temporary" | "permanent",
          banDurationDays: null,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Validate ban record fields
  TestValidator.equals(
    "ban duration type permanent",
    banRecord.banDurationType,
    "permanent",
  );
  TestValidator.equals(
    "ban duration days null",
    banRecord.banDurationDays,
    null,
  );
  TestValidator.equals("ban ends at null", banRecord.banEndsAt, null);
  TestValidator.equals(
    "banned user ID matches",
    banRecord.bannedUser.id,
    userToBan.id,
  );
  TestValidator.equals(
    "banning administrator ID matches",
    banRecord.banningAdministrator.id,
    admin.id,
  );
  TestValidator.predicate(
    "ban reason has sufficient length",
    banRecord.banReason.length >= 10,
  );
  // 5. Test banned user cannot log in
  await TestValidator.error("banned user login should fail", async () => {
    await authorize_user_login(
      { host: connection.host },
      {
        body: {
          email: userCredentials.email,
          password: userCredentials.password,
        } satisfies IDiscussionBoardUser.ILogin,
      },
    );
  });
  // 6. Validate administrative audit trail
  const expectedBanStatus = "active";
  const expectedAppealStatus = "none";
  TestValidator.equals(
    "ban status is active",
    banRecord.banStatus,
    expectedBanStatus,
  );
  TestValidator.equals(
    "appeal status is none",
    banRecord.appealStatus,
    expectedAppealStatus,
  );
}
