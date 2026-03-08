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

export async function test_api_admin_moderator_conduct_report(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeAdmin.IJoin,
  });
  // Test: Retrieve moderator conduct report
  const response =
    await api.functional.redditLike.admin.moderators.conduct.index(
      adminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditLikeModeratorRole.IRequest,
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate("has data array", response.data !== undefined);
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Validate pagination fields
  TestValidator.predicate(
    "pagination has current",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    response.pagination.pages >= 0,
  );
  // Validate pagination math
  if (response.pagination.records > 0 && response.pagination.limit > 0) {
    const expectedPages = Math.ceil(
      response.pagination.records / response.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculated correctly",
      response.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals(
      "pagination pages when no records",
      response.pagination.pages,
      0,
    );
  }
  // Validate data structure if records exist
  if (response.data.length > 0) {
    response.data.forEach((item, index) => {
      TestValidator.predicate(
        `data[${index}] has user`,
        item.user !== undefined,
      );
      TestValidator.predicate(
        `data[${index}] has community`,
        item.community !== undefined,
      );
      TestValidator.predicate(
        `data[${index}] has role`,
        item.role === "owner" || item.role === "moderator",
      );
      TestValidator.predicate(
        `data[${index}] has created_at`,
        item.created_at !== undefined,
      );
      TestValidator.predicate(
        `data[${index}] has ban_count`,
        item.ban_count >= 0,
      );
      TestValidator.predicate(
        `data[${index}] has report_count`,
        item.report_count >= 0,
      );
      TestValidator.predicate(
        `data[${index}] has average_handling_time_minutes`,
        item.average_handling_time_minutes >= 0,
      );
    });
  }
}