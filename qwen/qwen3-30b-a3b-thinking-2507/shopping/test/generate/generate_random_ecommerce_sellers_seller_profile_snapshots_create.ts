import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_seller_profile_snapshot } from "../prepare/prepare_random_ecommerce_seller_profile_snapshot";

export async function generate_random_ecommerce_sellers_seller_profile_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceSellerProfileSnapshot.ICreate> | undefined;
    params: {
      sellerId: string;
    };
  },
): Promise<IEcommerceSellerProfileSnapshot> {
  const prepared: IEcommerceSellerProfileSnapshot.ICreate =
    prepare_random_ecommerce_seller_profile_snapshot(props.body);
  return await api.functional.ecommerce.sellers.seller_profile_snapshots.create(
    connection,
    {
      body: prepared,
      sellerId: props.params.sellerId,
    },
  );
}
