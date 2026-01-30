import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostControversialScore";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsPostControversialScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsPostControversialScore";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_controversial_posts_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin-specific connection to isolate authentication state
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 2: Authenticate admin user via the authorized utility function for join
  // Use typia.random to generate realistic credentials matching ICommunityBbsAdmin.IJoin schema
  const adminAuth: ICommunityBbsAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Step 3: Use the authenticated admin connection to call the controversial posts analytics endpoint
  // The endpoint is read-only and returns paginated data ordered by controversy_score descending
  const response: IPageICommunityBbsPostControversialScore =
    await api.functional.communityBbs.admin.analytics.posts.controversial.index(
      adminConnection,
    );
  typia.assert(response);
}
