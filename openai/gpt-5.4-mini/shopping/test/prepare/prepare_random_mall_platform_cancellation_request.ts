import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform cancellation request data for E2E testing.
 *
 * Generates a complete IMallPlatformCancellationRequest.ICreate object using a
 * custom reason when provided, or realistic fallback text when omitted.
 */
export function prepare_random_mall_platform_cancellation_request(
  input?: DeepPartial<IMallPlatformCancellationRequest.ICreate> | undefined,
): IMallPlatformCancellationRequest.ICreate {
  return {
    reason:
      input?.reason ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 10 }),
  };
}
