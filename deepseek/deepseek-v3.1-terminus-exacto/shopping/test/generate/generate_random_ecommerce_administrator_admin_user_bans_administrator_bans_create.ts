import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdminUserBanOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfAdministrator";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_admin_user_ban_of_administrator } from "../prepare/prepare_random_ecommerce_admin_user_ban_of_administrator";

export async function generate_random_ecommerce_administrator_admin_user_bans_administrator_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdminUserBanOfAdministrator.ICreate>;
    params: {
      adminUserBanId: string;
    };
  },
): Promise<IEcommerceAdminUserBanOfAdministrator> {
  const prepared: IEcommerceAdminUserBanOfAdministrator.ICreate =
    prepare_random_ecommerce_admin_user_ban_of_administrator(props.body);
  const result: IEcommerceAdminUserBanOfAdministrator =
    await api.functional.ecommerce.administrator.admin_user_bans.administrator_bans.create(
      connection,
      {
        adminUserBanId: props.params.adminUserBanId,
        body: prepared,
      },
    );
  return result;
}
