import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_superadmin_ban_details_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate regular user to be banned
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(userAuth);
  // Step 2: Create and authenticate administrator who will issue the ban
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // Step 3: Create ban record as administrator
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userAuth.id,
          banReason: RandomGenerator.paragraph({ sentences: 3 }),
          banDurationType: "temporary" as const,
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // Step 4: Create and authenticate super administrator to retrieve ban details
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // Step 5: Retrieve ban details as super administrator
  const retrievedBan =
    await api.functional.discussionBoard.superAdmin.user_bans.at(
      superAdminConnection,
      { banId: banRecord.id },
    );
  typia.assert(retrievedBan);
  // Step 6: Validate retrieved ban details match original ban
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.banReason,
    banRecord.banReason,
  );
  TestValidator.equals(
    "ban duration type matches",
    retrievedBan.banDurationType,
    banRecord.banDurationType,
  );
  TestValidator.equals(
    "ban status is active",
    retrievedBan.banStatus,
    "active",
  );
  TestValidator.equals(
    "appeal status is none",
    retrievedBan.appealStatus,
    "none",
  );
  TestValidator.predicate(
    "ban started at is valid timestamp",
    retrievedBan.banStartedAt !== null,
  );
  TestValidator.predicate(
    "created at is valid timestamp",
    retrievedBan.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at is valid timestamp",
    retrievedBan.updatedAt !== null,
  );
  // Validate banned user information
  TestValidator.equals(
    "banned user ID matches",
    retrievedBan.bannedUser.id,
    userAuth.id,
  );
  TestValidator.equals(
    "banned user email matches",
    retrievedBan.bannedUser.email,
    userAuth.email,
  );
  TestValidator.equals(
    "banned user display name matches",
    retrievedBan.bannedUser.display_name,
    userAuth.display_name,
  );
  // Validate banning administrator information
  TestValidator.equals(
    "banning administrator ID matches",
    retrievedBan.banningAdministrator.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "banning administrator email matches",
    retrievedBan.banningAdministrator.email,
    adminAuth.email,
  );
  TestValidator.equals(
    "banning administrator display name matches",
    retrievedBan.banningAdministrator.display_name,
    adminAuth.display_name,
  );
  // Validate proper timestamp ordering
  TestValidator.predicate(
    "ban started at is after creation",
    new Date(retrievedBan.banStartedAt) >= new Date(retrievedBan.createdAt),
  );
  // Validate ban duration logic
  if (banRecord.banDurationType === "temporary") {
    TestValidator.equals(
      "temporary ban duration days matches",
      retrievedBan.banDurationDays,
      banRecord.banDurationDays,
    );
    TestValidator.predicate(
      "temporary ban has end date",
      retrievedBan.banEndsAt !== null,
    );
    TestValidator.predicate(
      "ban end date is after start date",
      new Date(retrievedBan.banEndsAt!) > new Date(retrievedBan.banStartedAt),
    );
  } else {
    TestValidator.equals(
      "permanent ban has null duration days",
      retrievedBan.banDurationDays,
      null,
    );
    TestValidator.equals(
      "permanent ban has null end date",
      retrievedBan.banEndsAt,
      null,
    );
  }
}
