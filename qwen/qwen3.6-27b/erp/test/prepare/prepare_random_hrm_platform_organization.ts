import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform organization creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformOrganization.ICreate with randomized values
 * for organization name, description, logo URI, currency, timezone, and fiscal
 * year start month. The name is generated as a human-readable identifier, while
 * currency and timezone are picked from realistic options.
 *
 * All fields can be partially overridden via the `input` parameter for
 * targeted test scenarios.
 */
export function prepare_random_hrm_platform_organization(
  input?: DeepPartial<IHrmPlatformOrganization.ICreate> | undefined,
): IHrmPlatformOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
    logo_uri:
      input?.logo_uri ??
      `https://example.com/logos/${RandomGenerator.alphaNumeric(8)}.png`,
    currency:
      input?.currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "GBP",
        "JPY",
        "CAD",
        "AUD",
      ] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "America/New_York",
        "America/Chicago",
        "America/Los_Angeles",
        "Europe/London",
        "Europe/Paris",
        "Asia/Seoul",
        "Asia/Tokyo",
        "Australia/Sydney",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
