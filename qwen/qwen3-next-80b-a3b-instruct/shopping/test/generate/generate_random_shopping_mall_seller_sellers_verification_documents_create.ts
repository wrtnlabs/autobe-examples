import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
import { prepare_random_shopping_mall_seller_verification_document } from "../prepare/prepare_random_shopping_mall_seller_verification_document";
export async function generate_random_shopping_mall_seller_sellers_verification_documents_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerVerificationDocument.ICreate>;
    params: {
      sellerId: string;
    };
  },
): Promise<IShoppingMallSellerVerificationDocument> {
  const prepared: IShoppingMallSellerVerificationDocument.ICreate =
    prepare_random_shopping_mall_seller_verification_document(props.body);
  return await api.functional.shoppingMall.seller.sellers.verification_documents.create(
    connection,
    {
      sellerId: props.params.sellerId,
      body: prepared,
    },
  );
}
