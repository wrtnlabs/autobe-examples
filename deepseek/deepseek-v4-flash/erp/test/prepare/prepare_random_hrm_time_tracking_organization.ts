import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time tracking organization creation data for E2E testing.
 *
 * Generates a complete {@link IHrmTimeTrackingOrganization.ICreate} with
 * randomized values. All properties are customizable via the optional
 * `input` parameter for specific test scenarios.
 *
 * The function produces realistic organization data including a readable
 * organization name, optional description text, a valid ISO 4217 currency
 * code, an IANA timezone identifier, and a fiscal start month (1-12).
 * String-type properties use human-readable text generation rather than
 * raw random character sequences.
 *
 * @param input - Partial overrides for specific property values
 * @returns A fully populated organization creation DTO
 */
export function prepare_random_hrm_time_tracking_organization(
  input?: DeepPartial<IHrmTimeTrackingOrganization.ICreate> | undefined,
): IHrmTimeTrackingOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP", "CNY"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "America/New_York",
        "Asia/Seoul",
        "Europe/London",
        "Asia/Tokyo",
        "Australia/Sydney",
        "Europe/Berlin",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
