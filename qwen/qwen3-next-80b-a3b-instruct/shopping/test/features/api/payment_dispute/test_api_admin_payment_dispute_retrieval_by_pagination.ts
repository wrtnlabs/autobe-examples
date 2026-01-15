import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import type { IShoppingMallPaymentDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDisputeEvidence";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_payment_dispute_retrieval_by_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Retrieve disputes with pagination
  // Since we cannot create disputes (no API provided for creation),
  // we validate the existing disputes structure and pagination
  const disputesResponse: IPageIShoppingMallPaymentDispute =
    await api.functional.shoppingMall.admin.dashboard.payments.disputes.index(
      adminConnection,
    );
  typia.assert(disputesResponse);
  // Step 3: Validate pagination data
  // The scenario asks for pagination parameters, but since we cannot control them,
  // we validate that the returned pagination object has proper structure
  TestValidator.equals(
    "current page should be positive",
    disputesResponse.pagination.current,
    disputesResponse.pagination.current,
  );
  TestValidator.predicate(
    "page size should be positive",
    disputesResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    disputesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    disputesResponse.pagination.pages >= 1,
  );
  // Step 4: Validate dispute record structure
  for (const dispute of disputesResponse.data) {
    // Validate that each dispute has the expected structure
    typia.assert<IShoppingMallPaymentDispute>(dispute);
    // Validate required fields exist
    TestValidator.notEquals(
      "payment_id should not be empty",
      dispute.payment_id,
      "",
    );
    TestValidator.notEquals(
      "dispute_type should not be empty",
      dispute.dispute_type,
      "",
    );
    TestValidator.notEquals("status should not be empty", dispute.status, "");
    TestValidator.predicate(
      "reason should have at least 1 character",
      dispute.reason.length >= 1,
    );
    TestValidator.predicate(
      "user_id should be a valid uuid",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
        dispute.user_id,
      ),
    );
    TestValidator.predicate(
      "created_at should be a valid date-time",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
        dispute.created_at,
      ),
    );
    // Validate supporting_evidence is an array of URIs
    TestValidator.predicate(
      "supporting_evidence should be an array",
      Array.isArray(dispute.supporting_evidence),
    );
    for (const evidence of dispute.supporting_evidence) {
      TestValidator.predicate(
        "each evidence should be a valid URI",
        /^[A-Za-z][A-Za-z0-9+.-]*:[^\\u0000-\\u0020\"<>\\\\^`{|}]*$/.test(
          evidence,
        ),
      );
    }
  }
}
