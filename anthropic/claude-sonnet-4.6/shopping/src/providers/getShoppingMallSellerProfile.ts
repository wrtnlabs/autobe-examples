import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallSellerTransformer } from "../transformers/ShoppingMallSellerTransformer";

export async function getShoppingMallSellerProfile(props: {
  seller: SellerPayload;
}): Promise<IShoppingMallSeller> {
  const record =
    await MyGlobal.prisma.shopping_mall_sellers.findUniqueOrThrow({
      where: {
        id: props.seller.id,
        deleted_at: null,
      },
      ...ShoppingMallSellerTransformer.select(),
    });
  return await ShoppingMallSellerTransformer.transform(record);
}
