import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_administrator_bans_create } from "../../../generate/generate_random_discussion_board_administrator_administrator_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_administrator_ban_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator #1
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_administrator_join(admin1Connection, {
    body: {
      email: `admin1_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    },
  });
  typia.assert(admin1Auth);
  admin1Connection.headers = { Authorization: admin1Auth.token.access };
  // 2. Authenticate as administrator #2 (target of ban update)
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_administrator_join(admin2Connection, {
    body: {
      email: `admin2_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "password123",
    },
  });
  typia.assert(admin2Auth);
  admin2Connection.headers = { Authorization: admin2Auth.token.access };
  // 3. Create a random ban by admin1
  const banOriginal =
    await generate_random_discussion_board_administrator_administrator_bans_create(
      admin1Connection,
      {
        body: {
          reason: `initial reason ${RandomGenerator.paragraph({ sentences: 1 })}`,
        },
      },
    );
  typia.assert(banOriginal);
  // 4. Prepare update body
  const now = new Date();
  const updatedAt = now.toISOString();
  const bannedAt = new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const updateBody: IDiscussionBoardUserBan.IUpdate = {
    reason: `updated reason ${RandomGenerator.paragraph({ sentences: 1 })}`,
    bannedAt: bannedAt,
    administratorId: admin2Auth.id,
    createdAt: banOriginal.createdAt,
    updatedAt: updatedAt,
    deletedAt: null,
  };
  // 5. Perform update
  const updatedBan =
    await api.functional.discussionBoard.administrator.administrator.bans.update(
      admin1Connection,
      {
        banId: banOriginal.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 6. Validate updated ban fields
  TestValidator.equals(
    "ban reason updated",
    updatedBan.reason,
    updateBody.reason!,
  );
  TestValidator.equals(
    "ban bannedAt updated",
    updatedBan.bannedAt,
    updateBody.bannedAt!,
  );
  TestValidator.equals(
    "ban administratorId updated",
    updatedBan.administratorId,
    updateBody.administratorId!,
  );
  // 7. Validate audit timestamps
  // updatedAt should be newer than or equal to original updatedAt
  const originalUpdatedAtTime = new Date(banOriginal.updatedAt).getTime();
  const newUpdatedAtTime = new Date(updatedBan.updatedAt).getTime();
  TestValidator.predicate(
    "updatedAt timestamp updated",
    newUpdatedAtTime >= originalUpdatedAtTime,
  );
  // createdAt should remain unchanged
  TestValidator.equals(
    "createdAt unchanged",
    updatedBan.createdAt,
    banOriginal.createdAt,
  );
  // deletedAt should remain null (no deletion)
  TestValidator.equals("deletedAt unchanged", updatedBan.deletedAt, null);
  // 8. Validate administrator summary
  TestValidator.equals(
    "administrator id matches update",
    updatedBan.administrator?.id,
    updateBody.administratorId!,
  );
  TestValidator.predicate(
    "administrator email present",
    typeof updatedBan.administrator?.email === "string" &&
      updatedBan.administrator?.email.length > 0,
  );
}
