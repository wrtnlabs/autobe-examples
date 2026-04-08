import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM platform organization creation data for E2E testing.
 *
 * Generates a complete IHrmPlatformOrganization.ICreate with randomized values for all required and optional fields. The organization serves as the foundational container for all subsequent entities including employees, projects, tasks, and time tracking data.
 *
 * All properties support input override through DeepPartial, allowing test-specific customization while providing sensible defaults for rapid test setup. Currency codes are selected from common ISO 4217 standards, and timezones use valid IANA identifiers.
 */
export function prepare_random_hrm_platform_organization(
  input?: DeepPartial<IHrmPlatformOrganization.ICreate>,
): IHrmPlatformOrganization.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 4,
      }) ??
      null,
    logo_url:
      input?.logo_url ??
      typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>() ??
      null,
    currency:
      input?.currency ??
      RandomGenerator.pick([
        "USD",
        "EUR",
        "KRW",
        "JPY",
        "GBP",
        "CNY",
        "AUD",
        "CAD",
      ] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
        "America/Los_Angeles",
        "Europe/Paris",
        "Australia/Sydney",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
