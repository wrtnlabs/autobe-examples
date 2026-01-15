import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerVerificationDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerVerificationDocument";
export function prepare_random_shopping_mall_seller_verification_document(
  input?: DeepPartial<IShoppingMallSellerVerificationDocument.ICreate>,
): IShoppingMallSellerVerificationDocument.ICreate {
  return {
    document_type: RandomGenerator.pick([
      "business_license",
      "id_card",
      "tax_id",
      "bank_account",
    ] as const),
    file_uri: typia.random<string & tags.Format<"uri">>(),
  };
}
