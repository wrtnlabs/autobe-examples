import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_analytics_dashboard_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: "12345678",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies DeepPartial<IRedditLikeAdmin.IJoin>,
  });
  // Retrieve admin analytics dashboard
  const dashboard =
    await api.functional.redditLike.admin.analytics.dashboard.at(
      adminConnection,
    );
  typia.assert(dashboard);
}