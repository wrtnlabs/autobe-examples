import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform organization creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformOrganization.ICreate with randomized values for all required properties including organization name, description, currency code, timezone, and fiscal year start month.
 */
export function prepare_random_hrm_platform_organization(
  input?: DeepPartial<IHrmPlatformOrganization.ICreate> | undefined,
): IHrmPlatformOrganization.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 3,
      }),
    currency: input?.currency ?? RandomGenerator.alphaNumeric(3).toUpperCase(),
    timezone: input?.timezone ?? RandomGenerator.alphaNumeric(10),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
