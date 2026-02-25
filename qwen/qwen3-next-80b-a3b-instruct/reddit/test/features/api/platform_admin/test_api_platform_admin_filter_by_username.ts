import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPlatformAdmin";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_filter_by_username(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };
  const adminConnection3: api.IConnection = { host: connection.host };
  
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1 = await authorize_platform_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin1Password,
      username: "admin_user",
    },
  });
  
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2 = await authorize_platform_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin2Password,
      username: "super_admin",
    },
  });
  
  const admin3Password = RandomGenerator.alphaNumeric(16);
  const admin3 = await authorize_platform_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin3Password,
      username: "regular_user",
    },
  });
  
  const loginConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_platform_admin_login(loginConnection, {
    body: {
      email: admin1.email,
      password: admin1Password,
    },
  });
  const filterResponse =
    await api.functional.redditCommunity.platformAdmin.platform_admins.index(
      loginConnection,
      {
        body: {
          username: "admin",
          is_deleted: false,
        },
      },
    );
  typia.assert(filterResponse);
  TestValidator.equals(
    "pagination current",
    filterResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    filterResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "pagination records >= 2",
    filterResponse.pagination.records >= 2,
  );
  TestValidator.equals("pagination pages", filterResponse.pagination.pages, 1);
  TestValidator.equals("data length", filterResponse.data.length, 2);
  const returnedUsernames = filterResponse.data.map((admin) => admin.username);
  TestValidator.predicate(
    "username1 contains 'admin'",
    returnedUsernames.includes("admin_user"),
  );
  TestValidator.predicate(
    "username2 contains 'admin'",
    returnedUsernames.includes("super_admin"),
  );
  TestValidator.predicate(
    "username3 does not appear",
    !returnedUsernames.includes("regular_user"),
  );
  for (const admin of filterResponse.data) {
    TestValidator.equals("is_deleted is false", admin.is_deleted, false);
  }
  for (let i = 0; i < filterResponse.data.length - 1; i++) {
    const current = new Date(filterResponse.data[i].created_at);
    const next = new Date(filterResponse.data[i + 1].created_at);
    TestValidator.predicate("sorted by created_at DESC", current >= next);
  }
}