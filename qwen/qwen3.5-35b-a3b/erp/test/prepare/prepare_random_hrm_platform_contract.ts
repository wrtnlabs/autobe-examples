import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform contract creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformContract.ICreate with randomized values for testing contract creation workflows. All fields except status are test-customizable via the input parameter. The status is always set to 'active' as required by business rules.
 */
export function prepare_random_hrm_platform_contract(
  input?: DeepPartial<IHrmPlatformContract.ICreate>,
): IHrmPlatformContract.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date ??
      (typia.random<string & tags.Format<"date-time">>() as
        | (string & tags.Format<"date-time">)
        | undefined),
    compensation_amount:
      input?.compensation_amount ?? typia.random<number & tags.Minimum<0>>(),
    compensation_currency:
      input?.compensation_currency ?? RandomGenerator.alphaNumeric(3),
    status: "active",
    notes:
      input?.notes ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 3,
      }),
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    organization_id:
      input?.organization_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
