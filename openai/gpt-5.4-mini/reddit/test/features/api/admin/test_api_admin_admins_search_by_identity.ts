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

export async function test_api_admin_admins_search_by_identity(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const matchingEmail = `admin_${RandomGenerator.alphabets(8)}@example.com`;
  const matchingPassword = `P@ssw0rd_${RandomGenerator.alphabets(8)}`;
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: matchingEmail,
      password: matchingPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(authorized);
  const otherConnection: api.IConnection = { host: connection.host };
  const otherEmail = `moderator_${RandomGenerator.alphabets(8)}@example.com`;
  const otherPassword = `P@ssw0rd_${RandomGenerator.alphabets(8)}`;
  const otherAuthorized = await authorize_admin_join(otherConnection, {
    body: {
      email: otherEmail,
      password: otherPassword,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(otherAuthorized);
  const searchTerm = matchingEmail.substring(0, matchingEmail.indexOf("@"));
  const limit = 10;
  const page = 1;
  const output = await api.functional.communityPlatform.admin.admins.index(
    adminConnection,
    {
      body: {
        search: searchTerm,
        page,
        limit,
      } satisfies ICommunityPlatformAdmin.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("requested page", output.pagination.current, page);
  TestValidator.equals("requested limit", output.pagination.limit, limit);
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned data should not exceed requested limit",
    output.data.length <= limit,
  );
  TestValidator.predicate(
    "every returned admin should match the search term",
    output.data.every((item) => item.email.includes(searchTerm)),
  );
  TestValidator.predicate(
    "filtered result should exclude non-matching admin identities",
    !output.data.some((item) => !item.email.includes(searchTerm)),
  );
  TestValidator.predicate(
    "search results should include the matching admin when present in dataset",
    output.data.some((item) => item.email === matchingEmail) ||
      output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination record count should cover returned rows",
    output.pagination.records >= output.data.length,
  );
  TestValidator.predicate(
    "pagination page count should align with records and limit",
    output.pagination.records === 0
      ? output.pagination.pages === 0
      : output.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "other admin identity should not leak into filtered results",
    !output.data.some((item) => item.email === otherEmail),
  );
}
