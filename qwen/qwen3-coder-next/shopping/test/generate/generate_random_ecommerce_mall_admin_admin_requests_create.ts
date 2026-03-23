import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_admin_request } from "../prepare/prepare_random_ecommerce_mall_admin_request";

export async function generate_random_ecommerce_mall_admin_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdminRequest.ICreate> | undefined;
  },
): Promise<IEcommerceMallAdminRequest> {
  const prepared: IEcommerceMallAdminRequest.ICreate =
    prepare_random_ecommerce_mall_admin_request(props.body);
  return await api.functional.ecommerceMall.admin.admin_requests.create(
    connection,
    {
      body: prepared,
    },
  );
}
