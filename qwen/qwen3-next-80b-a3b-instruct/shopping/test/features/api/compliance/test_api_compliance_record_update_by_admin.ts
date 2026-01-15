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
export async function test_api_compliance_record_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin using the utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a compliance record in 'pending_review' status using generation function
  const complianceRecord: IShoppingMallComplianceRecord =
    await generate_random_shopping_mall_compliance_records_create(
      adminConnection,
      {
        body: {
          compliance_type: "GDPR",
          compliance_category: "DataPrivacy",
          status: "pending_review",
          issue_date: new Date().toISOString(),
          // Removed 'findings' as it is not in ICreate interface
        } satisfies IShoppingMallComplianceRecord.ICreate,
      },
    );
  typia.assert(complianceRecord);
  // Step 3: Verify initial record state
  TestValidator.equals(
    "record should start with pending_review status",
    complianceRecord.status,
    "pending_review",
  );
  TestValidator.equals(
    "created_at should be set",
    Boolean(complianceRecord.created_at),
    true,
  );
  TestValidator.equals(
    "updated_at should be undefined initially",
    complianceRecord.updated_at,
    undefined,
  );
  TestValidator.equals(
    "created_by should match admin ID",
    complianceRecord.created_by,
    admin.id,
  );
  TestValidator.equals(
    "updated_by should be undefined initially",
    complianceRecord.updated_by,
    undefined,
  );
  // Step 4: Update compliance record status to 'violated' with justification
  const updatedRecord: IShoppingMallComplianceRecord =
    await api.functional.shoppingMall.admin.compliance.records.update(
      adminConnection,
      {
        recordId: complianceRecord.id,
        body: {
          status: "violated",
          justification:
            "Compliance audit identified serious violations of GDPR Article 7 regarding user consent. Data processing occurred without explicit, informed, and freely given consent from data subjects. This represents a critical regulatory breach that requires immediate remediation and potential reporting to supervisory authorities.",
        } satisfies IShoppingMallComplianceRecord.IUpdate,
      },
    );
  typia.assert(updatedRecord);
  // Step 5: Validate the updated record characteristics
  TestValidator.equals(
    "record status should be updated to violated",
    updatedRecord.status,
    "violated",
  );
  TestValidator.equals(
    "justification should be preserved",
    updatedRecord.findings,
    complianceRecord.findings,
  );
  TestValidator.equals(
    "purpose should remain unchanged",
    updatedRecord.purpose,
    complianceRecord.purpose,
  );
  TestValidator.equals(
    "created_at should be immutable",
    updatedRecord.created_at,
    complianceRecord.created_at,
  );
  TestValidator.equals(
    "updated_at should be set",
    Boolean(updatedRecord.updated_at),
    true,
  );
  TestValidator.predicate(
    "updated_at should be later than created_at",
    () => {
      if (updatedRecord.updated_at && complianceRecord.created_at) {
        return new Date(updatedRecord.updated_at) > new Date(complianceRecord.created_at);
      }
      return false;
    },
  );
  TestValidator.equals(
    "updated_by should be admin ID",
    updatedRecord.updated_by,
    admin.id,
  );
  TestValidator.equals(
    "created_by should remain unchanged",
    updatedRecord.created_by,
    complianceRecord.created_by,
  );
}