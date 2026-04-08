import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_user_ban_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminAuth);
  // 2. Create authorized connection for retrieving ban record
  const banConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: adminAuth.token.access },
  };
  // 3. Retrieve ban record by UUID
  const banId = typia.random<string & tags.Format<"uuid">>();
  const ban = await api.functional.ecommerceMall.administrator.user_bans.at(
    banConnection,
    { banId },
  );
  typia.assert(ban);
  // 4. Validate ban record structure
  TestValidator.equals("ban id is UUID", ban.id, banId);
  TestValidator.equals(
    "administrator_id is UUID",
    ban.administrator_id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals("user_type is string", typeof ban.user_type, "string");
  TestValidator.predicate(
    "user_type is customer or seller",
    ban.user_type === "customer" || ban.user_type === "seller",
  );
  TestValidator.equals("reason is string", typeof ban.reason, "string");
  TestValidator.equals(
    "banned_at is date-time",
    typeof ban.banned_at,
    "string",
  );
  TestValidator.equals(
    "created_at is date-time",
    typeof ban.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at is date-time",
    typeof ban.updated_at,
    "string",
  );
  TestValidator.predicate(
    "deleted_at is null or date-time",
    ban.deleted_at === null || typeof ban.deleted_at === "string",
  );
  // 5. Validate discriminator logic - customer ban
  if (ban.user_type === "customer") {
    TestValidator.predicate(
      "customer_id is populated for customer ban",
      ban.customer_id !== null,
    );
    TestValidator.equals(
      "seller_id is null for customer ban",
      ban.seller_id,
      null,
    );
    typia.assertGuard(ban.customer_id!);
    TestValidator.predicate(
      "customer_id is UUID",
      ban.customer_id.length === 36,
    );
  }
  // 6. Validate discriminator logic - seller ban
  if (ban.user_type === "seller") {
    TestValidator.predicate(
      "seller_id is populated for seller ban",
      ban.seller_id !== null,
    );
    TestValidator.equals(
      "customer_id is null for seller ban",
      ban.customer_id,
      null,
    );
    typia.assertGuard(ban.seller_id!);
    TestValidator.predicate(
      "seller_id is UUID",
      ban.seller_id.length === 36,
    );
  }
  // 7. Validate administrator summary
  TestValidator.equals(
    "administrator id in summary",
    ban.administrator.id,
    ban.administrator_id,
  );
  TestValidator.equals(
    "administrator displayName is string",
    typeof ban.administrator.displayName,
    "string",
  );
  TestValidator.predicate(
    "administrator email is email",
    ban.administrator.email.includes("@"),
  );
  TestValidator.predicate(
    "administrator grade is regular or super",
    ban.administrator.grade === "regular" ||
      ban.administrator.grade === "super" ||
      ban.administrator.grade === null,
  );
  TestValidator.equals(
    "administrator isBanned is boolean",
    typeof ban.administrator.isBanned,
    "boolean",
  );
  TestValidator.equals(
    "administrator createdAt is date-time",
    typeof ban.administrator.createdAt,
    "string",
  );
  TestValidator.equals(
    "administrator updatedAt is date-time",
    typeof ban.administrator.updatedAt,
    "string",
  );
  TestValidator.predicate(
    "administrator deletedAt is null or date-time",
    ban.administrator.deletedAt === null ||
      typeof ban.administrator.deletedAt === "string",
  );
}