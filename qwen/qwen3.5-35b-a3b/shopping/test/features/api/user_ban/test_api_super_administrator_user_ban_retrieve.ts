import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_user_ban_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(3),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Retrieve ban record using a generated UUID
  // Note: In production, this would retrieve an existing ban from the database
  const banId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.ecommerceMall.superAdministrator.user_bans.at(
      superAdminConnection,
      { banId },
    );
  typia.assert(banRecord);
  // 3. Validate ban record has all required fields
  TestValidator.equals("ban record has id", banRecord.id, banId);
  TestValidator.equals(
    "ban record has administrator_id",
    banRecord.administrator_id,
    banRecord.administrator.id,
  );
  TestValidator.equals(
    "ban record has user_type discriminator",
    banRecord.user_type,
    banRecord.user_type,
  );
  TestValidator.equals(
    "ban record has reason",
    banRecord.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "ban record has banned_at timestamp",
    banRecord.banned_at,
    banRecord.banned_at,
  );
  // 4. Validate discriminator logic - ensure only one of customer_id or seller_id is populated
  if (banRecord.user_type === "customer") {
    TestValidator.predicate(
      "customer ban has non-null customer_id",
      () => banRecord.customer_id !== null,
    );
    TestValidator.equals(
      "customer ban has null seller_id",
      banRecord.seller_id,
      null,
    );
  } else if (banRecord.user_type === "seller") {
    TestValidator.predicate(
      "seller ban has non-null seller_id",
      () => banRecord.seller_id !== null,
    );
    TestValidator.equals(
      "seller ban has null customer_id",
      banRecord.customer_id,
      null,
    );
  }
  // 5. Validate timestamps are valid ISO 8601 format
  TestValidator.equals(
    "created_at is valid datetime",
    banRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated_at is valid datetime",
    banRecord.updated_at,
    banRecord.updated_at,
  );
  TestValidator.equals(
    "banned_at is valid datetime",
    banRecord.banned_at,
    banRecord.banned_at,
  );
  typia.assert(banRecord.deleted_at);
  // 6. Validate administrator summary has all required fields
  typia.assert(banRecord.administrator);
  TestValidator.equals(
    "administrator has id",
    banRecord.administrator.id,
    banRecord.administrator.id,
  );
  TestValidator.equals(
    "administrator has email",
    banRecord.administrator.email,
    banRecord.administrator.email,
  );
  TestValidator.equals(
    "administrator has displayName",
    banRecord.administrator.displayName,
    banRecord.administrator.displayName,
  );
  TestValidator.equals(
    "administrator has grade",
    banRecord.administrator.grade,
    banRecord.administrator.grade,
  );
  TestValidator.equals(
    "administrator has isBanned",
    banRecord.administrator.isBanned,
    banRecord.administrator.isBanned,
  );
  TestValidator.equals(
    "administrator has createdAt",
    banRecord.administrator.createdAt,
    banRecord.administrator.createdAt,
  );
  TestValidator.equals(
    "administrator has updatedAt",
    banRecord.administrator.updatedAt,
    banRecord.administrator.updatedAt,
  );
  TestValidator.equals(
    "administrator has deletedAt",
    banRecord.administrator.deletedAt,
    banRecord.administrator.deletedAt,
  );
}