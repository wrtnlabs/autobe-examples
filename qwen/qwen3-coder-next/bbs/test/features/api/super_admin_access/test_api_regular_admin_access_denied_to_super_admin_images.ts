import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_regular_admin_access_denied_to_super_admin_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse =
    await api.functional.discussionBoard.auth.super_admin.join(
      superAdminConnection,
      {
        body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
      },
    );
  typia.assert(superAdminJoinResponse);
  // 2. Create and authenticate regular admin
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminJoinResponse =
    await api.functional.discussionBoard.auth.admin.join(
      regularAdminConnection,
      {
        body: typia.random<IDiscussionBoardAdmin.IJoin>(),
      },
    );
  typia.assert(regularAdminJoinResponse);
  // 3. Test unauthorized access to super admin exclusive endpoint
  await TestValidator.error(
    "regular admin should be denied access to super admin endpoint",
    async () => {
      await api.functional.discussionBoard.superAdmin.articles.images.index(
        regularAdminConnection,
        {
          articleId: typia.random<string>(),
        },
      );
    },
  );
}
