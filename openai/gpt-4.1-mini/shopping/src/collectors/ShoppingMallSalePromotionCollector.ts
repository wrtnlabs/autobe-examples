import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSalePromotionCollector {
  export async function collect(props: {
    body: IShoppingMallSalePromotion.ICreate;
    shoppingMallSales: IEntity;
  }) {
    const id: string = v4();
    return {
      id: id,
      promotion_code: props.body.promotionCode ?? null,
      promotion_type: props.body.promotionType,
      description: props.body.description ?? null,
      discount_value: props.body.discountValue,
      discount_type: props.body.discountType,
      start_at: new Date(props.body.startAt),
      end_at: new Date(props.body.endAt),
      active: props.body.active,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.shoppingMallSales.id } },
    } satisfies Prisma.shopping_mall_sale_promotionsCreateInput;
  }
}
