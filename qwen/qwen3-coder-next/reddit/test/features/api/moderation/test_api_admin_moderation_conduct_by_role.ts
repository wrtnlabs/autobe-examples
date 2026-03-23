import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModeratorRole";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeModeratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModeratorRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_moderation_conduct_by_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Test filtering by "owner" role
  const ownerResult =
    await api.functional.redditLike.admin.moderation.conduct.index(
      adminConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          role: "owner",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(ownerResult);
  TestValidator.equals(
    "filter by owner role",
    ownerResult.data.every((r) => r.role === "owner"),
    true,
  );
  // 3. Test filtering by "moderator" role
  const moderatorResult =
    await api.functional.redditLike.admin.moderation.conduct.index(
      adminConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(moderatorResult);
  TestValidator.equals(
    "filter by moderator role",
    moderatorResult.data.every((r) => r.role === "moderator"),
    true,
  );
  // 4. Validate pagination structure
  TestValidator.predicate("pagination structure", () => {
    const hasRequiredFields =
      "pagination" in ownerResult && "data" in ownerResult;
    if (!hasRequiredFields) return false;
    const pagination = ownerResult.pagination;
    return (
      "current" in pagination &&
      "limit" in pagination &&
      "records" in pagination &&
      "pages" in pagination
    );
  });
}
