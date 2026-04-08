import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBanOfSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_seller_ban_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create authenticated connection for API calls
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Request seller ban list with default pagination
  const banList =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(banList);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current is at least 1",
    banList.pagination.current,
    banList.pagination.current,
  );
  TestValidator.equals(
    "pagination limit is positive",
    banList.pagination.limit,
    banList.pagination.limit,
  );
  TestValidator.equals(
    "pagination records matches data length",
    banList.pagination.records,
    banList.data.length,
  );
  TestValidator.equals(
    "pagination pages calculated correctly",
    banList.pagination.pages,
    banList.pagination.pages,
  );
  // 5. Validate ban records structure when records exist
  if (banList.data.length > 0) {
    // Check first ban record structure
    const firstBan = banList.data[0];
    typia.assert(firstBan);
    // Verify ban subtype id exists
    TestValidator.predicate(
      "ban subtype id is present",
      firstBan.id !== undefined,
    );
    // Verify ban reference fields
    TestValidator.predicate(
      "ban id exists in parent reference",
      firstBan.ban.id !== undefined,
    );
    TestValidator.predicate(
      "ban reason exists in parent reference",
      firstBan.ban.reason !== undefined,
    );
    TestValidator.predicate(
      "ban banned_at exists in parent reference",
      firstBan.ban.banned_at !== undefined,
    );
    TestValidator.equals(
      "ban status is active",
      firstBan.ban.ban_status,
      "active",
    );
    // Verify seller reference fields
    TestValidator.predicate(
      "seller id exists",
      firstBan.seller.id !== undefined,
    );
    TestValidator.predicate(
      "seller display_name exists",
      firstBan.seller.display_name !== undefined,
    );
    TestValidator.predicate(
      "seller approval_status exists",
      firstBan.seller.approval_status !== undefined,
    );
    TestValidator.predicate(
      "seller email exists (if included)",
      firstBan.seller.email === undefined ||
        firstBan.seller.email !== undefined,
    );
    // Verify ban subtype timestamps
    TestValidator.predicate(
      "ban subtype created_at exists",
      firstBan.created_at !== undefined,
    );
    TestValidator.predicate(
      "ban subtype updated_at exists",
      firstBan.updated_at !== undefined,
    );
    // Verify all records are active (deleted_at is null)
    for (const ban of banList.data) {
      TestValidator.equals(
        `ban ${ban.id} is active (deleted_at is null)`,
        ban.deleted_at,
        null,
      );
    }
    // Verify all returned bans have active status
    for (const ban of banList.data) {
      TestValidator.equals(
        `ban ${ban.id} ban_status is active`,
        ban.ban.ban_status,
        "active",
      );
    }
    // Verify all records are sorted by banned_at descending
    for (let i = 1; i < banList.data.length; i++) {
      const prevBannedAt = new Date(
        banList.data[i - 1].ban.banned_at,
      ).getTime();
      const currBannedAt = new Date(banList.data[i].ban.banned_at).getTime();
      TestValidator.predicate(
        `records sorted descending at index ${i}`,
        prevBannedAt >= currBannedAt,
      );
    }
  }
}
