import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerator";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_actions_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditLikeAdmin.IJoin>(),
  });
  // 2. Test moderator actions retrieval with default pagination
  const output = await api.functional.redditLike.admin.moderation.actions.index(
    adminConnection,
    {
      body: typia.random<IRedditLikeModerator.IRequest>(),
    },
  );
  // 3. Validate response structure
  typia.assert(output);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    output.pagination !== undefined,
    true,
  );
  TestValidator.predicate("current page >= 1", output.pagination.current >= 1);
  TestValidator.predicate(
    "limit between 1-100",
    output.pagination.limit >= 1 && output.pagination.limit <= 100,
  );
  TestValidator.predicate("records >= 0", output.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", output.pagination.pages >= 0);
  // 5. Validate data structure
  TestValidator.equals("data array exists", output.data !== undefined, true);
  // 6. Validate each moderation action summary structure
  for (const action of output.data) {
    // Action type validation
    TestValidator.predicate(
      "valid action type",
      action.actionType === "ban" || action.actionType === "report",
    );
    // Timestamp validation
    TestValidator.predicate(
      "valid timestamp format",
      action.timestamp !== undefined && action.timestamp !== null,
    );
    // Performer validation
    TestValidator.equals(
      "performer exists",
      action.performer !== undefined,
      true,
    );
    TestValidator.equals(
      "performer has id",
      action.performer.id !== undefined,
      true,
    );
    TestValidator.equals(
      "performer has username",
      action.performer.username !== undefined,
      true,
    );
    TestValidator.equals(
      "performer has display_name",
      action.performer.display_name !== undefined,
      true,
    );
    // Target validation
    TestValidator.equals("target exists", action.target !== undefined, true);
    TestValidator.predicate("target has id", action.target.id !== undefined);
    // Community validation
    TestValidator.equals(
      "community exists",
      action.community !== undefined,
      true,
    );
    TestValidator.equals(
      "community has id",
      action.community.id !== undefined,
      true,
    );
    TestValidator.equals(
      "community has name",
      action.community.name !== undefined,
      true,
    );
    // Status validation
    TestValidator.predicate(
      "valid status",
      ["active", "inactive", "pending", "approved", "dismissed"].includes(
        action.status,
      ),
    );
  }
}
