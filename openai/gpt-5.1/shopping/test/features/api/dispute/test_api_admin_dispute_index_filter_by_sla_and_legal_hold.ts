import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDispute";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItemSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItemSummary";
import type { IShoppingMallCartOwnerCustomerSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerCustomerSummary";
import type { IShoppingMallCartOwnerGuestUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartOwnerGuestUserSummary";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCountry } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCountry";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddressSnapshot";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import type { IShoppingMallGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestUser";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPriceSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPriceSnapshot";
import type { IShoppingMallOrderShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderShippingAddress";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallPaymentChargeback } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentChargeback";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRefund";
import type { IShoppingMallPaymentStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatusHistory";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallRefundRequestReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestReason";
import type { IShoppingMallRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRegion";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentItem";
import type { IShoppingMallShippingAddressSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddressSnapshot";
import type { IShoppingMallShippingMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingMethod";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";
import type { IShoppingMallSkuExternalId } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuExternalId";
import type { IShoppingMallSkuInventoryState } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuInventoryState";

export async function test_api_admin_dispute_index_filter_by_sla_and_legal_hold(
  connection: api.IConnection,
) {
  // 1. Admin registration and login to obtain admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const joinedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const loggedInAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  // 2. Create a business policy and policy versions that will conceptually back SLA configs
  const policyCode: string = RandomGenerator.alphaNumeric(12);
  const businessPolicyBody = {
    policy_code: policyCode,
    name: "Dispute SLA Policy",
    category: "dispute_sla",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_active: true,
  } satisfies IShoppingMallBusinessPolicy.ICreate;

  const policy: IShoppingMallBusinessPolicy =
    await api.functional.shoppingMall.admin.businessPolicies.create(
      connection,
      {
        body: businessPolicyBody,
      },
    );
  typia.assert(policy);

  const policyVersionBodyA = {
    version_code: "v1",
    title: "Dispute SLA v1",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersionA: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionBodyA,
      },
    );
  typia.assert(policyVersionA);

  const policyVersionBodyB = {
    version_code: "v2",
    title: "Dispute SLA v2",
    body_markdown: RandomGenerator.content({ paragraphs: 2 }),
    parameters_json: null,
    status: "active",
    effective_from: new Date().toISOString(),
    effective_until: null,
  } satisfies IShoppingMallPolicyVersion.ICreate;

  const policyVersionB: IShoppingMallPolicyVersion =
    await api.functional.shoppingMall.admin.businessPolicies.versions.create(
      connection,
      {
        policyCode,
        body: policyVersionBodyB,
      },
    );
  typia.assert(policyVersionB);

  // 3. Create two SLA configurations (A and B) referencing different policy versions
  const slaCreateBodyA = {
    shopping_mall_business_policy_version_id: policyVersionA.id,
    case_type: "dispute",
    actor_role: "admin",
    action_type: "initial_response",
    target_duration_seconds: 3600,
    warning_duration_seconds: 1800,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfigA: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBodyA,
    });
  typia.assert(slaConfigA);

  const slaCreateBodyB = {
    shopping_mall_business_policy_version_id: policyVersionB.id,
    case_type: "dispute",
    actor_role: "admin",
    action_type: "final_decision",
    target_duration_seconds: 7200,
    warning_duration_seconds: 3600,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfigB: IShoppingMallCaseSlaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaCreateBodyB,
    });
  typia.assert(slaConfigB);

  // 4. Create a legal hold to be used conceptually for disputes
  const legalHoldCode: string = RandomGenerator.alphaNumeric(10);
  const legalHoldBody = {
    code: legalHoldCode,
    title: "Dispute Legal Hold",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    scope_description: "All disputes for test scenario",
    external_reference: RandomGenerator.alphaNumeric(16),
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  // 5. Helper to create disputes we can reliably filter by type and severity
  const createDispute = async (args: {
    dispute_code: string;
    type: string;
    severity: string;
    summary: string;
    description: string;
  }): Promise<IShoppingMallDispute> => {
    const body: IShoppingMallDispute.ICreate = {
      dispute_code: args.dispute_code,
      type: args.type,
      severity: args.severity,
      summary: args.summary,
      description: args.description,
      opened_at: new Date().toISOString(),
      shopping_mall_order_id: null,
      shopping_mall_refund_request_id: null,
      shopping_mall_payment_chargeback_id: null,
      shopping_mall_risk_case_id: null,
    };

    const created: IShoppingMallDispute =
      await api.functional.shoppingMall.admin.disputes.create(connection, {
        body,
      });
    typia.assert(created);
    return created;
  };

  // 6. Seed disputes with distinguishable severities and codes
  const typeCode = "refund_dispute";

  const disputeHigh1: IShoppingMallDispute = await createDispute({
    dispute_code: "D-HIGH-1",
    type: typeCode,
    severity: "high",
    summary: "High severity dispute #1",
    description: "Test dispute with high severity #1",
  });

  const disputeHigh2: IShoppingMallDispute = await createDispute({
    dispute_code: "D-HIGH-2",
    type: typeCode,
    severity: "high",
    summary: "High severity dispute #2",
    description: "Test dispute with high severity #2",
  });

  const disputeLow1: IShoppingMallDispute = await createDispute({
    dispute_code: "D-LOW-1",
    type: typeCode,
    severity: "low",
    summary: "Low severity dispute #1",
    description: "Test dispute with low severity #1",
  });

  const disputeLow2: IShoppingMallDispute = await createDispute({
    dispute_code: "D-LOW-2",
    type: typeCode,
    severity: "low",
    summary: "Low severity dispute #2",
    description: "Test dispute with low severity #2",
  });

  // 7. Verify index filtering by type and severity = "high"
  const highSeverityRequest: IShoppingMallDispute.IRequest = {
    page: 1,
    limit: 20,
    status: undefined,
    type: typeCode,
    severity: "high",
    shopping_mall_order_id: undefined,
    shopping_mall_refund_request_id: undefined,
    shopping_mall_payment_chargeback_id: undefined,
    shopping_mall_risk_case_id: undefined,
    shopping_mall_admin_id: undefined,
    opened_from: undefined,
    opened_to: undefined,
    sort_field: undefined,
    sort_order: undefined,
  };

  const highSeverityPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: highSeverityRequest,
    });
  typia.assert(highSeverityPage);

  const highData = highSeverityPage.data;
  TestValidator.predicate(
    "at least two high severity disputes returned for type filter",
    highData.length >= 2,
  );

  for (const summary of highData) {
    TestValidator.equals(
      "high severity filter keeps type consistent",
      summary.type,
      typeCode,
    );
    TestValidator.equals(
      "high severity filter keeps severity consistent",
      summary.severity,
      "high",
    );
  }

  const highCodes = new Set(highData.map((d) => d.dispute_code));
  TestValidator.predicate(
    "first created high severity dispute appears in index(high)",
    highCodes.has(disputeHigh1.dispute_code),
  );
  TestValidator.predicate(
    "second created high severity dispute appears in index(high)",
    highCodes.has(disputeHigh2.dispute_code),
  );

  // 8. Verify index filtering by type and severity = "low"
  const lowSeverityRequest: IShoppingMallDispute.IRequest = {
    page: 1,
    limit: 20,
    status: undefined,
    type: typeCode,
    severity: "low",
    shopping_mall_order_id: undefined,
    shopping_mall_refund_request_id: undefined,
    shopping_mall_payment_chargeback_id: undefined,
    shopping_mall_risk_case_id: undefined,
    shopping_mall_admin_id: undefined,
    opened_from: undefined,
    opened_to: undefined,
    sort_field: undefined,
    sort_order: undefined,
  };

  const lowSeverityPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: lowSeverityRequest,
    });
  typia.assert(lowSeverityPage);

  const lowData = lowSeverityPage.data;
  TestValidator.predicate(
    "at least two low severity disputes returned for type filter",
    lowData.length >= 2,
  );

  for (const summary of lowData) {
    TestValidator.equals(
      "low severity filter keeps type consistent",
      summary.type,
      typeCode,
    );
    TestValidator.equals(
      "low severity filter keeps severity consistent",
      summary.severity,
      "low",
    );
  }

  const lowCodes = new Set(lowData.map((d) => d.dispute_code));
  TestValidator.predicate(
    "first created low severity dispute appears in index(low)",
    lowCodes.has(disputeLow1.dispute_code),
  );
  TestValidator.predicate(
    "second created low severity dispute appears in index(low)",
    lowCodes.has(disputeLow2.dispute_code),
  );

  // 9. Fetch disputes by type only and inspect SLA and legal hold associations structurally
  const allDisputesRequest: IShoppingMallDispute.IRequest = {
    page: 1,
    limit: 50,
    status: undefined,
    type: typeCode,
    severity: undefined,
    shopping_mall_order_id: undefined,
    shopping_mall_refund_request_id: undefined,
    shopping_mall_payment_chargeback_id: undefined,
    shopping_mall_risk_case_id: undefined,
    shopping_mall_admin_id: undefined,
    opened_from: undefined,
    opened_to: undefined,
    sort_field: undefined,
    sort_order: undefined,
  };

  const allPage: IPageIShoppingMallDispute.ISummary =
    await api.functional.shoppingMall.admin.disputes.index(connection, {
      body: allDisputesRequest,
    });
  typia.assert(allPage);

  const allSummaries = allPage.data.filter(
    (d) =>
      d.dispute_code === disputeHigh1.dispute_code ||
      d.dispute_code === disputeHigh2.dispute_code ||
      d.dispute_code === disputeLow1.dispute_code ||
      d.dispute_code === disputeLow2.dispute_code,
  );

  TestValidator.equals(
    "all four seeded disputes are present when filtering by type only",
    allSummaries.length,
    4,
  );

  // We cannot force SLA or legal hold associations through available create APIs,
  // but we can at least assert that, when present, their summaries expose valid IDs.
  for (const summary of allSummaries) {
    if (summary.slaConfig !== undefined && summary.slaConfig !== null) {
      TestValidator.predicate(
        "slaConfig association, when present, has a non-empty id",
        typeof summary.slaConfig.id === "string" &&
          summary.slaConfig.id.length > 0,
      );
    }
    if (summary.legalHold !== undefined && summary.legalHold !== null) {
      TestValidator.predicate(
        "legalHold association, when present, has a non-empty id",
        typeof summary.legalHold.id === "string" &&
          summary.legalHold.id.length > 0,
      );
    }
  }

  // The presence of active SLA configs and legal holds created earlier ensures
  // that the system has SLA and legal hold infrastructure in place; the index
  // call is verified to respect type/severity filters and to expose association
  // structures without causing type or runtime errors.
}
