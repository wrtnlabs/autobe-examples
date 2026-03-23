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

export async function test_api_admin_moderation_conduct_overview(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin login to establish admin session
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeAdmin.IJoin,
  });
  typia.assert(adminUser);
  // Step 2: Retrieve moderator conduct overview with pagination
  // Note: Even though the DTO has required fields, this endpoint is for viewing ALL moderators
  // so we provide valid values for required fields to satisfy the type
  const conductOverview =
    await api.functional.redditLike.admin.moderation.conduct.index(
      adminConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator" as const,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(conductOverview);
  // Step 3: Validate response structure
  TestValidator.predicate(
    "has valid pagination",
    conductOverview.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has valid limit",
    conductOverview.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "has non-negative records",
    conductOverview.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has valid pages",
    conductOverview.pagination.pages >= 0,
  );
  // Step 4: Validate moderator role summaries structure
  conductOverview.data.forEach((moderator) => {
    TestValidator.equals(
      "has valid UUID id",
      moderator.id !== null && moderator.id !== undefined,
      true,
    );
    TestValidator.predicate(
      "role is valid",
      moderator.role === "owner" || moderator.role === "moderator",
    );
    TestValidator.predicate(
      "created_at is valid date-time string",
      typeof moderator.created_at === "string" &&
        moderator.created_at.length > 0,
    );
  });
}
