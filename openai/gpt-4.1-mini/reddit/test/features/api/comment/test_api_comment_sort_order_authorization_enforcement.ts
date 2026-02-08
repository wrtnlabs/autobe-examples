import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentSortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSortOrder";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_comment_sort_order_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Since the endpoint requires no authentication (publicly accessible), but the scenario requires to test authorization enforcement by calling without authenticated user connection.
  // We'll create a new connection with only the base host, meaning no Authorization header.
  const anonConnection: api.IConnection = { host: connection.host };
  // Generate random UUIDs for commentId and sortOrderId
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const sortOrderId = typia.random<string & tags.Format<"uuid">>();
  // Since the scenario expects authorization enforcement, call the API with anonymous connection, expecting an error (like 401 or 403)
  // The real endpoint is publicly accessible, but the scenario wants to test unauthorized access rejection.
  await TestValidator.httpError(
    "should reject access to comment sort order without authentication",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.user.comments.sort_orders.atSortOrder(
        anonConnection,
        { commentId, sortOrderId },
      );
    },
  );
}
