import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_organization } from "../prepare/prepare_random_hrm_platform_organization";

export async function generate_random_hrm_platform_member_organizations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformOrganization.ICreate> | undefined;
  },
): Promise<IHrmPlatformOrganization> {
  const prepared: IHrmPlatformOrganization.ICreate =
    prepare_random_hrm_platform_organization(props.body);
  const result: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.create(connection, {
      body: prepared,
    });
  return result;
}
