import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUserAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUserAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_vote_analytics_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection copying only the host, with no authentication headers
  const unauthConnection: api.IConnection = { host: connection.host };
  // Attempt to access the PATCH /communityPlatform/admin/analytics/posts/votes endpoint without authorization
  // Expect an HTTP 401 Unauthorized error or similar access control error
  await TestValidator.httpError(
    "unauthorized access to post vote analytics",
    401,
    async () => {
      await api.functional.communityPlatform.admin.analytics.posts.votes.index(
        unauthConnection,
        {
          body: {}, // Empty request body as it is simply testing access control
        },
      );
    },
  );
}
