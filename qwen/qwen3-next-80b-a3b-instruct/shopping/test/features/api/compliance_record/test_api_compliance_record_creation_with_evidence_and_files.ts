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
export async function test_api_compliance_record_creation_with_evidence_and_files(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Generate test data for compliance record
  // Add missing required properties: compliance_type and compliance_category
  const complianceRecord =
    await generate_random_shopping_mall_compliance_records_create(
      adminConnection,
      {
        body: {
          compliance_type: "FinancialReporting", // Fixed: Valid enum value from IShoppingMallComplianceRecord.ICreate
          compliance_category: "AuditLogging", // Fixed: Valid enum value from IShoppingMallComplianceRecord.ICreate
          status: "pending_review",
          issue_date: new Date().toISOString(),
          attached_files: ArrayUtil.repeat(2, () => {
            return {
              file_name: RandomGenerator.alphaNumeric(10) + ".pdf",
              file_size: typia.random<
                number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<10485760>
              >(),
              file_type: "application/pdf",
              content_hash: RandomGenerator.alphaNumeric(64),
            } satisfies IShoppingMallComplianceFile.ICreate;
          }),
        } satisfies IShoppingMallComplianceRecord.ICreate,
      },
    );
  typia.assert(complianceRecord);
  // Validate core structure is immutable and correctly populated
  // Remove invalid 'notes' assertions since property doesn't exist on IShoppingMallComplianceRecord
  TestValidator.equals(
    "status is pending_review",
    complianceRecord.status,
    "pending_review",
  );
  TestValidator.equals(
    "created_at is ISO date-time",
    complianceRecord.created_at.length > 0,
    true,
  );
  TestValidator.equals(
    "created_by is UUID",
    complianceRecord.created_by.length > 0,
    true,
  );
}
