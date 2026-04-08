import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_bans_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const joinConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_super_administrator_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(authResponse);
  // 2. Create authenticated connection
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authResponse.token.access },
  };
  // 3. Test default pagination (no parameters) - verify default sort is created_at desc
  const defaultResult =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(defaultResult);
  TestValidator.equals(
    "default pagination current",
    defaultResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default pagination limit within range",
    defaultResult.pagination.limit > 0 && defaultResult.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "default pagination records count matches",
    defaultResult.pagination.records >= defaultResult.data.length,
  );
  // 4. Test custom pagination: page=2, limit=5
  const page2Result =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { page: 2, limit: 5 } },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page=2 pagination current",
    page2Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page=2 pagination limit",
    page2Result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "page=2 data array length",
    page2Result.data.length <= 5 && page2Result.data.length > 0,
  );
  // 5. Test various sort combinations
  // 5.1 Sort by created_at ascending
  const sortByCreatedAtAsc =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { sort: "created_at:asc", limit: 10 } },
    );
  typia.assert(sortByCreatedAtAsc);
  // Verify sorting order (created_at ascending)
  for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
    const current = sortByCreatedAtAsc.data[i];
    const next = sortByCreatedAtAsc.data[i + 1];
    if (current.created_at > next.created_at) {
      throw new Error(
        `created_at asc validation failed at index ${i}: ${current.created_at} > ${next.created_at}`,
      );
    }
  }
  // 5.2 Sort by banned_at descending
  const sortByBannedAtDesc =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { sort: "banned_at:desc", limit: 10 } },
    );
  typia.assert(sortByBannedAtDesc);
  // Verify sorting order (banned_at descending)
  for (let i = 0; i < sortByBannedAtDesc.data.length - 1; i++) {
    const current = sortByBannedAtDesc.data[i];
    const next = sortByBannedAtDesc.data[i + 1];
    if (current.banned_at < next.banned_at) {
      throw new Error(
        `banned_at desc validation failed at index ${i}: ${current.banned_at} < ${next.banned_at}`,
      );
    }
  }
  // 5.3 Sort by reason alphabetically ascending
  const sortByReasonAsc =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { sort: "reason:asc", limit: 10 } },
    );
  typia.assert(sortByReasonAsc);
  // Verify sorting order (reason ascending)
  for (let i = 0; i < sortByReasonAsc.data.length - 1; i++) {
    const current = sortByReasonAsc.data[i];
    const next = sortByReasonAsc.data[i + 1];
    if (current.reason > next.reason) {
      throw new Error(
        `reason asc validation failed at index ${i}: "${current.reason}" > "${next.reason}"`,
      );
    }
  }
  // 5.4 Sort by administrator_id ascending
  const sortByAdminIdAsc =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { sort: "administrator_id:asc", limit: 10 } },
    );
  typia.assert(sortByAdminIdAsc);
  // Verify sorting order (administrator_id ascending)
  for (let i = 0; i < sortByAdminIdAsc.data.length - 1; i++) {
    const current = sortByAdminIdAsc.data[i];
    const next = sortByAdminIdAsc.data[i + 1];
    if (current.administrator.id > next.administrator.id) {
      throw new Error(
        `administrator_id asc validation failed at index ${i}: ${current.administrator.id} > ${next.administrator.id}`,
      );
    }
  }
  // 6. Test pagination + sorting combination
  const combinedResult =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { page: 1, limit: 5, sort: "banned_at:desc" } },
    );
  typia.assert(combinedResult);
  TestValidator.equals(
    "combined pagination current",
    combinedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "combined pagination limit",
    combinedResult.pagination.limit,
    5,
  );
  // Verify combined sorting order
  for (let i = 0; i < combinedResult.data.length - 1; i++) {
    const current = combinedResult.data[i];
    const next = combinedResult.data[i + 1];
    if (current.banned_at < next.banned_at) {
      throw new Error(
        `combined banned_at desc validation failed at index ${i}: ${current.banned_at} < ${next.banned_at}`,
      );
    }
  }
  // 7. Test edge case: page beyond available pages
  const edgeCaseResult =
    await api.functional.ecommerceMall.superAdministrator.bans.index(
      adminConnection,
      { body: { page: 100, limit: 5 } },
    );
  typia.assert(edgeCaseResult);
  TestValidator.equals(
    "edge case pagination current",
    edgeCaseResult.pagination.current,
    100,
  );
  TestValidator.equals(
    "edge case pagination limit",
    edgeCaseResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "edge case data is empty",
    edgeCaseResult.data.length,
    0,
  );
  TestValidator.predicate(
    "edge case pages calculation",
    edgeCaseResult.pagination.pages >= 0,
  );
}
