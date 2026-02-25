import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_admin_ban_superadmin_attribution(
  connection: api.IConnection,
): Promise<void> {
  // Create base connections for different actors
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Create and authenticate a regular user (to be banned)
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create and authenticate a regular administrator
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create and authenticate a super administrator
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Regular admin creates a ban on the regular user
  const adminBan = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: userAuth.id,
        banReason: RandomGenerator.paragraph({ sentences: 2 }),
        banDurationType: "permanent",
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(adminBan);
  // Super admin creates a ban on the regular user
  const superAdminBan =
    await generate_random_discussion_board_admin_bans_create(
      superAdminConnection,
      {
        body: {
          bannedUserId: userAuth.id,
          banReason: RandomGenerator.paragraph({ sentences: 2 }),
          banDurationType: "temporary",
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(superAdminBan);
  // Validate that banned user is correct in both ban records
  TestValidator.equals(
    "admin ban should target the correct user",
    adminBan.bannedUser.id,
    userAuth.id,
  );
  TestValidator.equals(
    "super admin ban should target the correct user",
    superAdminBan.bannedUser.id,
    userAuth.id,
  );
  // Validate that banningAdministrator field exists and has correct structure
  TestValidator.predicate(
    "admin ban should have banning administrator",
    adminBan.banningAdministrator !== null,
  );
  TestValidator.predicate(
    "super admin ban should have banning administrator",
    superAdminBan.banningAdministrator !== null,
  );
  // Validate polymorphic attribution - both should have administrator records
  TestValidator.equals(
    "admin ban administrator should match regular admin ID",
    adminBan.banningAdministrator.id,
    adminAuth.id,
  );
  TestValidator.equals(
    "super admin ban administrator should have correct structure",
    superAdminBan.banningAdministrator.email,
    superAdminAuth.email,
  );
  // Validate ban duration types are correctly set
  TestValidator.equals(
    "admin ban should be permanent",
    adminBan.banDurationType,
    "permanent",
  );
  TestValidator.equals(
    "super admin ban should be temporary",
    superAdminBan.banDurationType,
    "temporary",
  );
  // Validate temporal attributes
  TestValidator.predicate(
    "admin ban should have start time",
    adminBan.banStartedAt.length > 0,
  );
  TestValidator.predicate(
    "super admin ban should have start time",
    superAdminBan.banStartedAt.length > 0,
  );
  TestValidator.predicate(
    "permanent ban should have null end time",
    adminBan.banEndsAt === null,
  );
  TestValidator.predicate(
    "temporary ban should have calculated end time",
    superAdminBan.banEndsAt !== null,
  );
  // Validate audit trail completeness
  TestValidator.predicate(
    "both bans should have creation timestamps",
    adminBan.createdAt.length > 0 && superAdminBan.createdAt.length > 0,
  );
  TestValidator.predicate(
    "both bans should have update timestamps",
    adminBan.updatedAt.length > 0 && superAdminBan.updatedAt.length > 0,
  );
}
