import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationsSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationsSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform organization snapshot creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformOrganizationsSnapshot.ICreate with randomized
 * values for organization snapshot creation, including name, description, branding,
 * financial settings (currency, fiscal year), timezone, and status.
 *
 * All fields except metadata are required per the DTO specification.
 */
export function prepare_random_hrm_platform_organizations_snapshot(
  input?: DeepPartial<IHrmPlatformOrganizationsSnapshot.ICreate> | undefined,
): IHrmPlatformOrganizationsSnapshot.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri: input?.logo_uri ?? RandomGenerator.alphaNumeric(50),
    currency:
      input?.currency ??
      typia.random<string & tags.MinLength<2> & tags.MaxLength<5>>(),
    timezone: input?.timezone ?? typia.random<string & tags.MaxLength<100>>(),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "inactive", "pending"] as const),
    metadata: input?.metadata ?? RandomGenerator.alphaNumeric(20),
  };
}
