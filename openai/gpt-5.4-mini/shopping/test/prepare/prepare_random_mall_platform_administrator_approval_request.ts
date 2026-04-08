import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministratorApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministratorApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform administrator approval request creation data for E2E testing.
 *
 * Generates a complete IMallPlatformAdministratorApprovalRequest.ICreate payload.
 * The caller may override any field through the DeepPartial input, while omitted
 * fields are filled with realistic randomized content.
 */
export function prepare_random_mall_platform_administrator_approval_request(
  input?:
    | DeepPartial<IMallPlatformAdministratorApprovalRequest.ICreate>
    | undefined,
): IMallPlatformAdministratorApprovalRequest.ICreate {
  return {
    reason: input?.reason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
