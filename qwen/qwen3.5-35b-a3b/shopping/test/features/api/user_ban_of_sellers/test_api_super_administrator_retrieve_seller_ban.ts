import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_retrieve_seller_ban(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(adminResult);
  // Step 2: Retrieve a seller ban subtype record
  // Note: In a full test suite, a ban would be created first through admin ban creation endpoint
  // This test retrieves an existing ban subtype record to validate the retrieval functionality
  const banOfSellerId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_sellers.at(
      adminConnection,
      { banOfSellerId },
    );
  typia.assert(banRecord);
  // Step 3: Validate ban subtype record structure
  TestValidator.equals(
    "ban subtype id is valid UUID",
    banRecord.id,
    banRecord.id,
  );
  // Validate ban object structure and content
  TestValidator.equals("ban record has id", banRecord.ban.id, banRecord.ban.id);
  TestValidator.equals(
    "user_type discriminator is seller",
    banRecord.ban.user_type,
    "seller",
  );
  TestValidator.equals(
    "ban reason is non-empty string",
    banRecord.ban.reason.length > 0,
    true,
  );
  TestValidator.equals(
    "banned_at timestamp is valid ISO 8601",
    banRecord.ban.banned_at,
    banRecord.ban.banned_at,
  );
  TestValidator.equals(
    "ban_status is active",
    banRecord.ban.ban_status,
    "active",
  );
  // Validate administrator who issued the ban
  TestValidator.equals(
    "administrator id exists",
    banRecord.ban.administrator.id,
    banRecord.ban.administrator.id,
  );
  TestValidator.equals(
    "administrator display name exists",
    banRecord.ban.administrator.displayName,
    banRecord.ban.administrator.displayName,
  );
  TestValidator.equals(
    "administrator email is valid",
    banRecord.ban.administrator.email,
    banRecord.ban.administrator.email,
  );
  // Validate seller object structure and content
  TestValidator.equals(
    "seller id exists",
    banRecord.seller.id,
    banRecord.seller.id,
  );
  TestValidator.equals(
    "seller display name exists",
    banRecord.seller.display_name,
    banRecord.seller.display_name,
  );
  TestValidator.equals(
    "seller approval_status exists",
    banRecord.seller.approval_status,
    banRecord.seller.approval_status,
  );
  TestValidator.equals(
    "seller is_suspended is true",
    banRecord.seller.is_suspended,
    true,
  );
  TestValidator.equals(
    "seller email exists",
    banRecord.seller.email,
    banRecord.seller.email,
  );
  // Validate timestamps
  TestValidator.equals(
    "created_at timestamp is valid",
    banRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated_at timestamp is valid",
    banRecord.updated_at,
    banRecord.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null (active ban)",
    banRecord.deleted_at,
    null,
  );
}
