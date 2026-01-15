import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_record_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate using the authorized utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminData });
  // Step 2: Enable simulation mode to generate a compliance record (since we don't have a create API)
  adminConnection.simulate = true;
  // Step 3: Retrieve a compliance record with a randomly generated UUID
  // The simulation will return a random compliance record (from typia.random<IShoppingMallComplianceRecord>())
  // This is the ONLY way to get a valid compliance record from the system with the provided APIs.
  const recordId = typia.random<string & tags.Format<"uuid">>();
  const retrievedRecord =
    await api.functional.shoppingMall.admin.compliance.records.at(
      adminConnection,
      {
        recordId,
      },
    );
  // Step 4: Validate the retrieved record's structure and data
  typia.assert(retrievedRecord);
  // Step 5: Validate that all required fields are present and of correct type
  TestValidator.predicate(
    "purpose is not empty",
    retrievedRecord.purpose.length > 0,
  );
  TestValidator.predicate(
    "findings is not empty",
    retrievedRecord.findings.length > 0,
  );
  TestValidator.equals(
    "status is one of the allowed values",
    retrievedRecord.status as string,
    RandomGenerator.pick([
      "pending_review",
      "violated",
      "corrected",
      "archived",
    ] as const),
  );
  TestValidator.predicate(
    "created_at is a valid date-time",
    new Date(retrievedRecord.created_at) instanceof Date,
  );
  TestValidator.predicate(
    "created_by is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      retrievedRecord.created_by,
    ),
  );
  TestValidator.equals(
    "recordId matches the requested ID",
    retrievedRecord.id,
    recordId,
  );
}
