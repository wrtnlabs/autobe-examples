import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSystemStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_system_status } from "../prepare/prepare_random_ecommerce_system_status";

export async function generate_random_ecommerce_admin_system_statuses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSystemStatus.ICreate> | undefined;
  },
): Promise<IEcommerceSystemStatus> {
  const prepared: IEcommerceSystemStatus.ICreate =
    prepare_random_ecommerce_system_status(props.body);
  return await api.functional.ecommerce.admin.system_statuses.create(
    connection,
    {
      body: prepared,
    },
  );
}
