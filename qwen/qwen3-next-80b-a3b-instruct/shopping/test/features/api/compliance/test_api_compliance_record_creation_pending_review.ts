import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallComplianceFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceFile";
import type { IShoppingMallComplianceRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComplianceRecord";
import { prepare_random_shopping_mall_compliance_record } from "../../../prepare/prepare_random_shopping_mall_compliance_record";
import { prepare_random_shopping_mall_compliance_file } from "../../../prepare/prepare_random_shopping_mall_compliance_file";
import { generate_random_shopping_mall_compliance_records_create } from "../../../generate/generate_random_shopping_mall_compliance_records_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_compliance_record_creation_pending_review(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a compliance record using the generation utility function
  // This ensures proper type handling and follows the utility-first pattern
  const complianceRecord: IShoppingMallComplianceRecord =
    await generate_random_shopping_mall_compliance_records_create(
      adminConnection,
      {
        // Only send the required fields from the scenario
        body: {
          status: "pending_review",
          issue_date: new Date().toISOString(),
        },
      },
    );
  typia.assert(complianceRecord);
  // Step 3: Validate key properties
  TestValidator.equals(
    "status is pending_review",
    complianceRecord.status,
    "pending_review",
  );
  TestValidator.equals(
    "created_by matches admin id",
    complianceRecord.created_by,
    admin.id,
  );
}
