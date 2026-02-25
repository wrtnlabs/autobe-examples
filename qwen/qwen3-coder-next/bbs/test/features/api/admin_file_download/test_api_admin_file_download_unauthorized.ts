import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_admin_file_download_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registration and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Member registration and login for unauthorized access attempt
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  await authorize_member_login(memberConnection, {
    body: {
      email: (
        await api.functional.discussionBoard.auth.member.join(
          memberConnection,
          {
            body: {
              email: typia.random<string & tags.Format<"email">>(),
              password: RandomGenerator.alphaNumeric(16),
              displayName: RandomGenerator.name(),
              passwordConfirmation: RandomGenerator.alphaNumeric(16),
            } satisfies IDiscussionBoardMember.IJoin,
          },
        )
      ).email,
      password: RandomGenerator.alphaNumeric(16),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 3. Test unauthorized file download attempt by member
  // Verify that non-admin users receive 403 Forbidden when attempting admin-only download
  await TestValidator.error("member cannot download admin file", async () => {
    await api.functional.discussionBoard.admin.articles.files.download.downloadFile(
      memberConnection,
      {
        articleId: typia.random<string>(),
        fileId: typia.random<string>(),
      },
    );
  });
}
