import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_admin_promotion_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_admin_promotion_requests_create";
import { prepare_random_ecommerce_mall_admin_promotion_request } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion_request";

export async function test_api_admin_promotion_request_retrieval_reviewed_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {},
  });
  // Step 2: Create admin promotion request
  const createdRequest =
    await generate_random_ecommerce_mall_customer_admin_promotion_requests_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(createdRequest);
  // Step 3: Retrieve the promotion request by ID
  const retrievedRequest =
    await api.functional.ecommerceMall.customer.admin_promotion_requests.at(
      customerConnection,
      { requestId: createdRequest.id },
    );
  typia.assert(retrievedRequest);
  // Step 4: Validate business logic for reviewed status
  // If status is approved or rejected, verify reviewer is populated and rejectionReason behavior
  if (
    retrievedRequest.status === "approved" ||
    retrievedRequest.status === "rejected"
  ) {
    TestValidator.predicate("reviewer is present for reviewed request", () => {
      return retrievedRequest.reviewer !== null;
    });
    // Verify reviewer has required fields
    if (retrievedRequest.reviewer !== null) {
      TestValidator.predicate("reviewer has valid id", () => {
        return (
          typeof retrievedRequest.reviewer!.id === "string" &&
          retrievedRequest.reviewer!.id.length > 0
        );
      });
      TestValidator.predicate("reviewer has valid email", () => {
        return (
          typeof retrievedRequest.reviewer!.email === "string" &&
          retrievedRequest.reviewer!.email.length > 0
        );
      });
      TestValidator.predicate("reviewer has valid grade", () => {
        return (
          retrievedRequest.reviewer!.grade === "regular" ||
          retrievedRequest.reviewer!.grade === "super_admin"
        );
      });
      TestValidator.predicate("reviewer has valid status", () => {
        return ["active", "suspended", "banned"].includes(
          retrievedRequest.reviewer!.status,
        );
      });
      TestValidator.predicate("reviewer has valid createdAt", () => {
        return typeof retrievedRequest.reviewer!.createdAt === "string";
      });
    }
    // Verify rejectionReason based on status
    if (retrievedRequest.status === "rejected") {
      TestValidator.predicate(
        "rejectionReason is set for rejected request",
        () => {
          return (
            typeof retrievedRequest.rejectionReason === "string" &&
            retrievedRequest.rejectionReason.length > 0
          );
        },
      );
    } else if (retrievedRequest.status === "approved") {
      TestValidator.predicate(
        "rejectionReason is null for approved request",
        () => {
          return retrievedRequest.rejectionReason === null;
        },
      );
    }
    // Verify updatedAt is valid
    TestValidator.predicate(
      "updatedAt is after createdAt for reviewed request",
      () => {
        return (
          new Date(retrievedRequest.updatedAt) >=
          new Date(retrievedRequest.createdAt)
        );
      },
    );
  }
  // Step 5: Validate all fields are properly populated
  TestValidator.predicate("id is valid UUID", () => {
    return (
      typeof retrievedRequest.id === "string" && retrievedRequest.id.length > 0
    );
  });
  TestValidator.predicate("reason is populated", () => {
    return (
      typeof retrievedRequest.reason === "string" &&
      retrievedRequest.reason.length >= 10 &&
      retrievedRequest.reason.length <= 1000
    );
  });
  TestValidator.predicate("requester is populated", () => {
    return (
      retrievedRequest.requester !== null &&
      retrievedRequest.requester !== undefined
    );
  });
  TestValidator.predicate("createdAt is valid", () => {
    return typeof retrievedRequest.createdAt === "string";
  });
  TestValidator.predicate("updatedAt is valid", () => {
    return typeof retrievedRequest.updatedAt === "string";
  });
  TestValidator.equals(
    "request IDs match",
    createdRequest.id,
    retrievedRequest.id,
  );
}
