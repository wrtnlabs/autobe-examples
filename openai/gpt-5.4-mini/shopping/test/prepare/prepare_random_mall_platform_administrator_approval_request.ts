import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform administrator approval request creation data for E2E testing.
 *
 * Generates a complete `IMallPlatformAdministratorApprovalRequest.ICreate` payload.
 * The request only accepts the applicant's reason, so this function preserves any
 * caller-provided value and otherwise creates a realistic fallback explanation.
 *
 * @param input - Deep partial input allowing test-time customization.
 * @returns A complete administrator approval request creation payload.
 */
export function prepare_random_mall_platform_administrator_approval_request(
  input?:
    | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
    | undefined,
): IMallPlatformAdministratorApprovalRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
