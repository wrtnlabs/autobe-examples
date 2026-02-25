import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdminUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfCustomer";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_admin_user_ban_of_customer } from "../prepare/prepare_random_ecommerce_admin_user_ban_of_customer";

export async function generate_random_ecommerce_administrator_admin_user_bans_customer_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdminUserBanOfCustomer.ICreate>;
    params: {
      adminUserBanId: string & tags.Format<"uuid">;
    };
  },
): Promise<IEcommerceAdminUserBanOfCustomer> {
  const prepared: IEcommerceAdminUserBanOfCustomer.ICreate =
    prepare_random_ecommerce_admin_user_ban_of_customer(props.body);
  const result: IEcommerceAdminUserBanOfCustomer =
    await api.functional.ecommerce.administrator.admin_user_bans.customer_bans.create(
      connection,
      {
        adminUserBanId: props.params.adminUserBanId,
        body: prepared,
      },
    );
  return result;
}
