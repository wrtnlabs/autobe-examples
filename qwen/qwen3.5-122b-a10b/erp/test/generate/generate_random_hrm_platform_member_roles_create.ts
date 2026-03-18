import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_hrm_platform_role } from "../prepare/prepare_random_hrm_platform_role";

export async function generate_random_hrm_platform_member_roles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformRole.ICreate> | undefined;
  },
): Promise<IHrmPlatformRole> {
  const prepared: IHrmPlatformRole.ICreate = prepare_random_hrm_platform_role(
    props.body,
  );
  const result: IHrmPlatformRole =
    await api.functional.hrmPlatform.member.roles.create(connection, {
      body: prepared,
    });
  return result;
}
