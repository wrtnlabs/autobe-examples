import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random HRM time track organization creation data for E2E testing.
 *
 * Generates a complete IHrmTimeTrackOrganization.ICreate with randomized values
 * for organization identity, operational settings, and fiscal configuration.
 * The organization serves as the root container for multi-tenant HRM and time
 * tracking data with complete data isolation between tenants.
 *
 * All properties support test-time customization through the DeepPartial input
 * parameter, allowing selective override of specific fields while maintaining
 * realistic defaults for others.
 */
export function prepare_random_hrm_time_track_organization(
  input?: DeepPartial<IHrmTimeTrackOrganization.ICreate>,
): IHrmTimeTrackOrganization.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 3 }),
    logo: input?.logo ?? typia.random<string & tags.Format<"url">>(),
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "KRW", "EUR", "JPY", "GBP"] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "UTC",
        "America/New_York",
        "Europe/London",
        "Asia/Tokyo",
      ] as const),
    fiscal_start_month:
      input?.fiscal_start_month ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
      >(),
  };
}
