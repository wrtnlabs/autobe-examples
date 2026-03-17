import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_registration } from "../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function generate_random_ecommerce_mall_seller_registrations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerRegistration.ICreate> | undefined;
  },
): Promise<IEcommerceMallSellerRegistration> {
  const prepared: IEcommerceMallSellerRegistration.ICreate =
    prepare_random_ecommerce_mall_seller_registration(props.body);
  const result: IEcommerceMallSellerRegistration =
    await api.functional.ecommerceMall.seller.registrations.create(connection, {
      body: prepared,
    });
  return result;
}
