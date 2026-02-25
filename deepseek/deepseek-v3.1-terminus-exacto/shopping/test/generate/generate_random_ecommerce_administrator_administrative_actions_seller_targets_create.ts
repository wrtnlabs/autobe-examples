import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdminUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminUserBanOfSeller";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_admin_user_ban_of_seller } from "../prepare/prepare_random_ecommerce_admin_user_ban_of_seller";

export async function generate_random_ecommerce_administrator_administrative_actions_seller_targets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdminUserBanOfSeller.ICreate>;
    params: {
      administrativeActionId: string;
    };
  },
): Promise<IEcommerceAdminUserBanOfSeller> {
  const prepared: IEcommerceAdminUserBanOfSeller.ICreate =
    prepare_random_ecommerce_admin_user_ban_of_seller(props.body);
  const result: IEcommerceAdminUserBanOfSeller =
    await api.functional.ecommerce.administrator.administrative_actions.seller_targets.create(
      connection,
      {
        administrativeActionId: props.params.administrativeActionId,
        body: prepared,
      },
    );
  return result;
}
