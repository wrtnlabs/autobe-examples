import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_seller_ban_subtype_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: typia.random<IEcommerceMallAdministrator.IJoin>(),
  });
  typia.assert(admin);
  // 2. Create seller ban
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_ecommerce_mall_administrator_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "seller" as const,
          seller_id: sellerId,
          reason: banReason,
        } satisfies IEcommerceMallUserBan.ICreate,
      },
    );
  typia.assert(ban);
  // 3. Retrieve seller ban subtype
  const banOfSellerId = ban.sellerBan.id;
  const retrievedBan =
    await api.functional.ecommerceMall.administrator.user_ban_of_sellers.at(
      adminConnection,
      { banOfSellerId },
    );
  typia.assert(retrievedBan);
  // 4. Validate response structure
  TestValidator.equals(
    "ban subtype ID matches",
    retrievedBan.id,
    banOfSellerId,
  );
  TestValidator.equals(
    "ban user_type is seller",
    retrievedBan.ban.user_type,
    "seller",
  );
  TestValidator.equals(
    "ban status is active",
    retrievedBan.ban.ban_status,
    "active",
  );
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.ban.reason,
    banReason,
  );
  TestValidator.equals(
    "banned_at timestamp exists",
    typeof retrievedBan.ban.banned_at,
    "string",
  );
  TestValidator.equals(
    "administrator ID exists",
    retrievedBan.ban.administrator.id !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator email exists",
    retrievedBan.ban.administrator.email !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator display name exists",
    retrievedBan.ban.administrator.displayName !== undefined,
    true,
  );
  TestValidator.equals("seller ID matches", retrievedBan.seller.id, sellerId);
  TestValidator.equals(
    "seller display name exists",
    retrievedBan.seller.display_name !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null (active ban)",
    retrievedBan.deleted_at,
    null,
  );
  TestValidator.equals(
    "created_at timestamp exists",
    typeof retrievedBan.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    typeof retrievedBan.updated_at,
    "string",
  );
  TestValidator.equals(
    "ban created_at timestamp exists",
    typeof retrievedBan.ban.created_at,
    "string",
  );
  TestValidator.equals(
    "ban updated_at timestamp exists",
    typeof retrievedBan.ban.updated_at,
    "string",
  );
}
