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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test retrieval of temporary and permanent ban records to verify duration handling.
 * Validates banEndsAt discrimination (null for permanent, calculated date for temporary)
 */
export async function test_api_user_ban_retrieval_temporary_permanent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Note: Since user creation endpoints are not available in provided DTOs,
  // using random UUIDs as bannedUserId is the only option
  // 2. Create temporary ban (7 days duration)
  const tempBan = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "temporary" as const,
        banDurationDays: 7,
      },
    },
  );
  typia.assert(tempBan);
  // 3. Create permanent ban
  const permBan = await generate_random_discussion_board_admin_user_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: typia.random<string & tags.Format<"uuid">>(),
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "permanent" as const,
        banDurationDays: null,
      },
    },
  );
  typia.assert(permBan);
  // 4. Retrieve temporary ban and validate duration handling
  const retrievedTempBan =
    await api.functional.discussionBoard.admin.user_bans.at(adminConnection, {
      banId: tempBan.id,
    });
  typia.assert(retrievedTempBan);
  // 5. Retrieve permanent ban and validate indefinite duration
  const retrievedPermBan =
    await api.functional.discussionBoard.admin.user_bans.at(adminConnection, {
      banId: permBan.id,
    });
  typia.assert(retrievedPermBan);
  // 6. Validate temporary ban characteristics
  TestValidator.equals(
    "temporary ban duration type",
    retrievedTempBan.banDurationType,
    "temporary",
  );
  TestValidator.equals(
    "temporary ban duration days",
    retrievedTempBan.banDurationDays,
    7,
  );
  TestValidator.predicate(
    "temporary ban has end date",
    retrievedTempBan.banEndsAt !== null,
  );
  // 7. Validate permanent ban characteristics
  TestValidator.equals(
    "permanent ban duration type",
    retrievedPermBan.banDurationType,
    "permanent",
  );
  TestValidator.equals(
    "permanent ban duration days",
    retrievedPermBan.banDurationDays,
    null,
  );
  TestValidator.equals(
    "permanent ban has null end date",
    retrievedPermBan.banEndsAt,
    null,
  );
  // 8. Validate ban status consistency
  TestValidator.equals(
    "initial ban status",
    retrievedTempBan.banStatus,
    retrievedPermBan.banStatus,
  );
  TestValidator.equals(
    "initial appeal status",
    retrievedTempBan.appealStatus,
    retrievedPermBan.appealStatus,
  );
  // 9. Validate audit trail integrity
  TestValidator.equals("ban IDs match", retrievedTempBan.id, tempBan.id);
  TestValidator.equals(
    "permanent ban IDs match",
    retrievedPermBan.id,
    permBan.id,
  );
  TestValidator.predicate(
    "ban start time exists",
    retrievedTempBan.banStartedAt !== null,
  );
  TestValidator.predicate(
    "ban reason preserved",
    retrievedTempBan.banReason.length >= 10,
  );
}
