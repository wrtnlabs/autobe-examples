import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test image update authorization check with invalid article ownership.
 *
 * This test validates that administrators cannot update images on articles
 * they don't own or aren't authorized to manage.
 */
export async function test_api_image_update_authorization_check(
  connection: api.IConnection,
): Promise<void> {
  // Create first admin account
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Response = await api.functional.discussionBoard.auth.admin.join(
    admin1Connection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(admin1Response);
  // Update admin1 connection with token
  admin1Connection.headers = {
    Authorization: `Bearer ${admin1Response.token.access}`,
  };
  // Create second admin account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Response = await api.functional.discussionBoard.auth.admin.join(
    admin2Connection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  typia.assert(admin2Response);
  // Update admin2 connection with token
  admin2Connection.headers = {
    Authorization: `Bearer ${admin2Response.token.access}`,
  };
  // TODO: Complete the test scenario
}
