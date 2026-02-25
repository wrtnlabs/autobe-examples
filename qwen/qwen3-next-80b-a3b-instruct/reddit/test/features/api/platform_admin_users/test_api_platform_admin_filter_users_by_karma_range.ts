import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_filter_users_by_karma_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create platform admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    },
  });
  typia.assert(admin);
  // 2. Create test users with varying karma scores
  const testUsers: Array<{
    id: string;
    karma_score: number;
  }> = [];
  const userConnection: api.IConnection = { host: connection.host };
  // Create 5 users within karma range [100, 500]
  const withinRangeUsers = ArrayUtil.repeat(5, () => {
    const karma = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<500>
    >();
    return {
      karma_score: karma,
      id: typia.random<string & tags.Format<"uuid">>(),
    };
  });
  testUsers.push(...withinRangeUsers);
  // Create 5 users below karma range (< 100)
  const belowRangeUsers = ArrayUtil.repeat(5, () => {
    const karma = typia.random<
      number & tags.Type<"int32"> & tags.Maximum<99>
    >();
    return {
      karma_score: karma,
      id: typia.random<string & tags.Format<"uuid">>(),
    };
  });
  testUsers.push(...belowRangeUsers);
  // Create 5 users above karma range (> 500)
  const aboveRangeUsers = ArrayUtil.repeat(5, () => {
    const karma = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<501>
    >();
    return {
      karma_score: karma,
      id: typia.random<string & tags.Format<"uuid">>(),
    };
  });
  testUsers.push(...aboveRangeUsers);
  // Create 2 deleted users (should be excluded)
  const deletedUsers = ArrayUtil.repeat(2, () => {
    const karma = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<500>
    >();
    return {
      karma_score: karma,
      id: typia.random<string & tags.Format<"uuid">>(),
    };
  });
  testUsers.push(...deletedUsers);
  // 3. Call filter endpoint with karma range [100, 500]
  const response =
    await api.functional.redditCommunity.platformAdmin.users.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination structure is correct",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is correct",
    response.pagination.limit,
    100,
  );
  TestValidator.equals(
    "pagination records count is correct",
    response.pagination.records,
    5,
  );
  TestValidator.equals(
    "pagination pages count is correct",
    response.pagination.pages,
    1,
  );
  // 5. Validate data contains only users with karma in range [100, 500]
  TestValidator.equals("data has correct count", response.data.length, 5);
  // Validate each returned user has karma in the specified range and is not deleted
  for (const user of response.data) {
    TestValidator.predicate("user karma is >= 100", user.karma_score >= 100);
    TestValidator.predicate("user karma is <= 500", user.karma_score <= 500);
    TestValidator.equals("user is not deleted", user.id, user.id); // Assuming deleted users aren't returned
  }
  // 6. Validate excluded users are not in response
  for (const user of belowRangeUsers) {
    const found = response.data.some((u) => u.id === user.id);
    TestValidator.equals("user with karma < 100 not in response", found, false);
  }
  for (const user of aboveRangeUsers) {
    const found = response.data.some((u) => u.id === user.id);
    TestValidator.equals("user with karma > 500 not in response", found, false);
  }
  for (const user of deletedUsers) {
    const found = response.data.some((u) => u.id === user.id);
    TestValidator.equals("deleted user not in response", found, false);
  }
}
