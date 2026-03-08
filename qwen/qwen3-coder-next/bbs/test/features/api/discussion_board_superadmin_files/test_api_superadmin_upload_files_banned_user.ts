import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_superadmin_upload_files_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super admin connection and login
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 2. Create member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 3. Ban the member user
  const banReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 15,
  });
  const banRecord =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member.id,
          ban_reason: banReason,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(banRecord);
  TestValidator.equals("ban reason matches", banRecord.ban_reason, banReason);
  // 4. Verify banned user cannot login
  const bannedConnection: api.IConnection = { host: connection.host };
  try {
    await authorize_member_login(bannedConnection, {
      body: {
        email: member.email,
        password: "1234",
      } satisfies IDiscussionBoardMember.ILogin,
    });
    TestValidator.equals(
      "banned user should not login successfully",
      false,
      true,
    );
  } catch (error) {
    TestValidator.predicate("banned user login fails", () => {
      if (!typia.is<api.HttpError>(error)) return false;
      return error.status === 401 || error.status === 403;
    });
  }
  // 5. Verify banned user cannot upload files to articles
  const articleId = typia.random<string & tags.Format<"uuid">>();
  try {
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      bannedConnection,
      { articleId },
    );
    TestValidator.equals("banned user file upload should fail", false, true);
  } catch (error) {
    TestValidator.predicate("banned user upload fails", () => {
      if (!typia.is<api.HttpError>(error)) return false;
      return error.status === 403 || error.status === 401;
    });
  }
  // 6. Verify super admin can still upload files
  const fileUpload =
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      superAdminConnection,
      { articleId },
    );
  typia.assert(fileUpload);
  TestValidator.equals(
    "file upload succeeds",
    fileUpload.id !== undefined,
    true,
  );
  // 7. Verify banned user session remains rejected for file upload
  try {
    await api.functional.discussionBoard.superAdmin.articles.files.create(
      bannedConnection,
      { articleId },
    );
    TestValidator.equals(
      "banned user session should remain rejected",
      false,
      true,
    );
  } catch (error) {
    TestValidator.predicate("session remains rejected", () => {
      if (!typia.is<api.HttpError>(error)) return false;
      return error.status === 401 || error.status === 403;
    });
  }
}
