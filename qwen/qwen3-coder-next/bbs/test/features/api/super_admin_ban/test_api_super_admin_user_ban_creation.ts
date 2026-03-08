import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_sections_articles_create } from "../../../generate/generate_random_discussion_board_member_sections_articles_create";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_super_admin_user_ban_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: "Super Admin User",
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Register regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: "Regular Member",
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Login as super admin to get authentication for ban creation
  const superAdminLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdminLogin = await authorize_super_admin_login(
    superAdminLoginConnection,
    {
      body: {
        email: superAdmin.email,
        password: "1234",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminLogin);
  // 4. Create ban record
  const banRecord = await api.functional.discussionBoard.superAdmin.bans.create(
    superAdminLoginConnection,
    {
      body: {
        ban_reason: "Violation of community guidelines - repeated offenses",
        discussion_board_member_id: member.id,
        administrator_id: superAdminLogin.id,
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 5. Validate ban record
  TestValidator.equals("ban record user matches", banRecord.user.id, member.id);
  TestValidator.equals(
    "ban reason matches",
    banRecord.ban_reason,
    "Violation of community guidelines - repeated offenses",
  );
  TestValidator.equals(
    "administrator matches",
    banRecord.administrator.id,
    superAdminLogin.id,
  );
  TestValidator.predicate(
    "banned_at timestamp is set",
    () => banRecord.banned_at !== null && banRecord.banned_at !== undefined,
  );
  TestValidator.predicate(
    "created_at timestamp is set",
    () => banRecord.created_at !== null && banRecord.created_at !== undefined,
  );
}
