import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_contract } from "../prepare/prepare_random_hrm_platform_contract";

export async function generate_random_hrm_platform_member_contracts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformContract.ICreate>;
  },
): Promise<IHrmPlatformContract> {
  const prepared: IHrmPlatformContract.ICreate =
    prepare_random_hrm_platform_contract(props.body);
  const result: IHrmPlatformContract =
    await api.functional.hrmPlatform.member.contracts.create(connection, {
      body: prepared,
    });
  return result;
}
