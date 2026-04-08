import { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random seller approval request creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallSellerApprovalRequest.ICreate with randomized seller reason text.
 * The request_reason captures the seller's business intent for joining the e-commerce platform,
 * used by administrators to evaluate suitability. Input can override any generated values
 * for specific test scenarios.
 */
export function prepare_random_ecommerce_mall_seller_approval_request(
  input?: DeepPartial<IEcommerceMallSellerApprovalRequest.ICreate>,
): IEcommerceMallSellerApprovalRequest.ICreate {
  return {
    request_reason:
      input?.request_reason ??
      RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
  };
}
