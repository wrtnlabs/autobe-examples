import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
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

export async function test_api_admin_moderator_conduct_report_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for unauthorized access test
  const memberConnection: api.IConnection = { host: connection.host };
  // Register a member account
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(),
    password: "12341234",
    display_name: RandomGenerator.name(),
    bio: null,
    avatar_url: null,
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: memberCredentials,
  });
  // Login as member
  await authorize_member_login(memberConnection, {
    body: {
      email: memberCredentials.email,
      password: memberCredentials.password,
    } satisfies IRedditLikeMember.ILogin,
  });
  // Attempt to access admin-only endpoint with member credentials
  // Member should get 403 Forbidden for admin-only endpoints
  await TestValidator.error("403 Forbidden for non-admin user", async () => {
    await api.functional.redditLike.admin.moderators.conduct.index(
      memberConnection,
      {
        body: {
          limit: 10,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  });
}
