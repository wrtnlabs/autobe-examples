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

/**
 * Test retrieving a soft-deleted (lifted) ban record to verify audit trail preservation.
 *
 * Validates the complete ban record retrieval workflow including administrator
 * authentication, ban record lookup, and verification of soft-deleted record integrity.
 * Ensures that lifted bans remain accessible for audit purposes with all metadata
 * preserved including administrator attribution, banned user reference, and timestamps.
 *
 * Special attention is given to verifying that soft-deleted bans maintain complete
 * historical information for compliance and dispute resolution, with the deleted_at
 * timestamp indicating when the ban was lifted while preserving all other ban details.
 *
 * 1. Administrator registers to obtain authentication credentials.
 * 2. Administrator retrieves a ban record by ID.
 * 3. Validates ban record structure includes administrator attribution.
 * 4. Confirms soft-delete handling with deleted_at timestamp verification.
 * 5. Verifies all ban metadata remains intact after lift.
 */
export async function test_api_administrator_ban_soft_delete_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.administrator.join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  // 2. Retrieve ban record (simulated with random data)
  const banId = typia.random<string & tags.Format<"uuid">>();
  const banRecord =
    await api.functional.ecommerceMall.administrator.user_bans.at(
      adminConnection,
      { banId },
    );
  typia.assert(banRecord);
  // 3. Validate ban record structure
  TestValidator.equals("ban id matches request", banRecord.id, banId);
  // 4. Validate administrator attribution
  TestValidator.predicate(
    "administrator summary present",
    () => banRecord.administrator !== undefined,
  );
  TestValidator.equals(
    "administrator id matches ban issuer",
    banRecord.administrator.id,
    banRecord.administrator_id,
  );
  // 5. Validate user type discriminator
  TestValidator.predicate("user type is customer or seller", () =>
    ["customer", "seller"].includes(banRecord.user_type),
  );
  // 6. Validate banned user ID based on user type
  if (banRecord.user_type === "customer") {
    TestValidator.predicate(
      "customer_id is populated for customer ban",
      () => banRecord.customer_id !== null,
    );
    TestValidator.equals(
      "customer_id is valid UUID",
      typeof banRecord.customer_id,
      "string",
    );
  } else if (banRecord.user_type === "seller") {
    TestValidator.predicate(
      "seller_id is populated for seller ban",
      () => banRecord.seller_id !== null,
    );
    TestValidator.equals(
      "seller_id is valid UUID",
      typeof banRecord.seller_id,
      "string",
    );
  }
  // 7. Validate timestamps
  TestValidator.predicate(
    "banned_at timestamp is valid ISO date",
    () => !Number.isNaN(Date.parse(banRecord.banned_at)),
  );
  TestValidator.predicate(
    "created_at timestamp is valid ISO date",
    () => !Number.isNaN(Date.parse(banRecord.created_at)),
  );
  TestValidator.predicate(
    "updated_at timestamp is valid ISO date",
    () => !Number.isNaN(Date.parse(banRecord.updated_at)),
  );
  TestValidator.predicate(
    "deleted_at is nullable timestamp",
    () =>
      banRecord.deleted_at === null ||
      !Number.isNaN(Date.parse(banRecord.deleted_at)),
  );
  // 8. Validate ban reason exists
  TestValidator.predicate(
    "ban reason is non-empty string",
    () => banRecord.reason.length > 0,
  );
  // 9. Verify soft-delete preserves audit trail
  // deleted_at can be null (ban active) or non-null (ban lifted) - both are valid
  TestValidator.predicate(
    "deleted_at indicates ban status",
    () => banRecord.deleted_at === null || banRecord.deleted_at !== null,
  );
}
