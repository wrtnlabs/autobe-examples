import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_email_verification } from "../prepare/prepare_random_shopping_mall_seller_email_verification";

export async function generate_random_shopping_mall_seller_email_verifications_verify_email(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallSellerEmailVerification.ICreate>
      | undefined;
  },
): Promise<IShoppingMallSellerEmailVerification> {
  const prepared: IShoppingMallSellerEmailVerification.ICreate =
    prepare_random_shopping_mall_seller_email_verification(props.body);
  return await api.functional.shoppingMall.seller.email_verifications.verifyEmail(
    connection,
    {
      body: prepared,
    },
  );
}
