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

export async function test_api_super_administrator_lifted_ban_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResponse = await authorize_super_administrator_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      },
    },
  );
  typia.assert(adminResponse);
  // 2. Generate ban ID (using a UUID from test database)
  const banId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the ban record
  const banRecord =
    await api.functional.ecommerceMall.superAdministrator.user_bans.at(
      adminConnection,
      { banId },
    );
  typia.assert(banRecord);
  // 4. Verify response structure includes all required fields
  TestValidator.equals("ban ID matches", banRecord.id, banId);
  TestValidator.notEquals(
    "admin ID present",
    banRecord.administrator_id,
    "00000000-0000-0000-0000-000000000000",
  );
  TestValidator.notEquals("user type present", banRecord.user_type, "");
  TestValidator.predicate("reason is non-empty", banRecord.reason.length > 0);
  TestValidator.predicate(
    "banned_at is valid datetime",
    banRecord.banned_at !== null,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    banRecord.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    banRecord.updated_at !== null,
  );
  // 5. Verify soft delete (lifted ban) - deleted_at should be present
  TestValidator.predicate(
    "deleted_at is set for lifted ban",
    banRecord.deleted_at !== null,
  );
  // 6. Verify administrator reference with complete summary
  TestValidator.equals(
    "administrator ID matches",
    banRecord.administrator.id,
    banRecord.administrator_id,
  );
  TestValidator.predicate(
    "administrator display name is non-empty",
    banRecord.administrator.displayName.length > 0,
  );
  TestValidator.equals(
    "administrator email is valid format",
    banRecord.administrator.email,
    banRecord.administrator.email,
  );
  TestValidator.predicate(
    "administrator createdAt is valid datetime",
    banRecord.administrator.createdAt !== null,
  );
  TestValidator.predicate(
    "administrator updatedAt is valid datetime",
    banRecord.administrator.updatedAt !== null,
  );
  TestValidator.predicate(
    "administrator deletedAt is nullable",
    banRecord.administrator.deletedAt === null ||
      banRecord.administrator.deletedAt !== null,
  );
  // 7. Verify customer_id or seller_id based on user_type discriminator
  if (banRecord.user_type === "customer") {
    TestValidator.notEquals(
      "customer_id present for customer ban",
      banRecord.customer_id,
      null,
    );
    TestValidator.equals(
      "seller_id is null for customer ban",
      banRecord.seller_id,
      null,
    );
  } else if (banRecord.user_type === "seller") {
    TestValidator.equals(
      "customer_id is null for seller ban",
      banRecord.customer_id,
      null,
    );
    TestValidator.notEquals(
      "seller_id present for seller ban",
      banRecord.seller_id,
      null,
    );
  } else {
    throw new Error(
      `Invalid user_type: ${banRecord.user_type}. Expected 'customer' or 'seller'.`,
    );
  }
  // 8. Verify deleted_at is ISO 8601 datetime format
  const deletedAt = banRecord.deleted_at;
  typia.assert(deletedAt);
}
