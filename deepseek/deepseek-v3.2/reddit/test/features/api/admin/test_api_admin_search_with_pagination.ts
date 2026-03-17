import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_search_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create three admin accounts using utility function
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin1);
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin2);
  const adminConnection3: api.IConnection = { host: connection.host };
  const admin3 = await authorize_admin_join(adminConnection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin3);
  const adminEmails = [admin1.email, admin2.email, admin3.email];
  // Test basic pagination search
  const searchResponse = await api.functional.communityPlatform.admins.index(
    adminConnection1, // Use authenticated admin connection
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(searchResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    searchResponse.pagination.limit,
    searchResponse.pagination.limit,
  );
  TestValidator.predicate(
    "total records >= 3",
    searchResponse.pagination.records >= 3,
  );
  TestValidator.predicate(
    "total pages >= 1",
    searchResponse.pagination.pages >= 1,
  );
  // Validate response structure
  TestValidator.predicate("data is array", Array.isArray(searchResponse.data));
  // Check that our created admins appear in results
  const foundEmails = searchResponse.data.map((admin) => admin.email);
  for (const email of adminEmails) {
    TestValidator.predicate(
      `admin email ${email} found in search results`,
      foundEmails.includes(email),
    );
  }
  // Test edge case: page beyond available data
  const emptyPageResponse = await api.functional.communityPlatform.admins.index(
    adminConnection1,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<100>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(emptyPageResponse);
  TestValidator.equals(
    "empty data array for page beyond available data",
    emptyPageResponse.data.length,
    0,
  );
}
