import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_time_tracking_organization } from "../prepare/prepare_random_hrm_time_tracking_organization";

export async function generate_random_hrm_time_tracking_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingOrganization.ICreate> | undefined;
  },
): Promise<IHrmTimeTrackingOrganization> {
  const prepared: IHrmTimeTrackingOrganization.ICreate =
    prepare_random_hrm_time_tracking_organization(props.body);
  return await api.functional.hrmTimeTracking.member.organizations.create(
    connection,
    {
      body: prepared,
    },
  );
}
