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
    sale: IEntity;
  }) {
    return {
      id: v4(),
      promotion_code: null,
      promotion_type: "default",
      description: null,
      discount_value: 0,
      discount_type: "fixed",
      start_at: new Date(),
      end_at: new Date(),
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
    } satisfies Prisma.shopping_mall_sale_promotionsCreateInput;
  }
}
