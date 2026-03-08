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

export async function test_api_admin_moderator_conduct_report_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // 2. Test with custom limit parameter (valid range: 1-100)
  const result1 =
    await api.functional.redditLike.admin.moderators.conduct.index(
      adminConnection,
      {
        body: {
          limit: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result1);
  // 3. Test with default limit (should use server default)
  const result2 =
    await api.functional.redditLike.admin.moderators.conduct.index(
      adminConnection,
      {
        body: {
          limit: 50,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result2);
  // 4. Test with cursor-based pagination (optional cursor parameter)
  const result3 =
    await api.functional.redditLike.admin.moderators.conduct.index(
      adminConnection,
      {
        body: {
          limit: 20,
          cursor: undefined,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result3);
  // 5. Test with page-based pagination (optional page parameter)
  const result4 =
    await api.functional.redditLike.admin.moderators.conduct.index(
      adminConnection,
      {
        body: {
          limit: 25,
          page: 1,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(result4);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "has pagination metadata",
    result1.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(result1.data));
  TestValidator.equals(
    "data matches records count",
    result1.data.length,
    result1.pagination.limit,
  );
  TestValidator.equals(
    "current page is valid",
    result1.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "page count is valid",
    result1.pagination.pages >= 0,
    true,
  );
  // 7. Verify moderator conduct records structure
  if (result1.data.length > 0) {
    const firstRecord = result1.data[0];
    typia.assert(firstRecord);
    TestValidator.equals(
      "has user summary",
      firstRecord.user !== undefined,
      true,
    );
    TestValidator.equals(
      "has community summary",
      firstRecord.community !== undefined,
      true,
    );
    TestValidator.predicate(
      "has valid role",
      ["owner", "moderator"].includes(firstRecord.role),
    );
    TestValidator.equals(
      "ban_count is non-negative",
      firstRecord.ban_count >= 0,
      true,
    );
    TestValidator.equals(
      "report_count is non-negative",
      firstRecord.report_count >= 0,
      true,
    );
    TestValidator.equals(
      "average_handling_time_minutes is non-negative",
      firstRecord.average_handling_time_minutes >= 0,
      true,
    );
  }
}