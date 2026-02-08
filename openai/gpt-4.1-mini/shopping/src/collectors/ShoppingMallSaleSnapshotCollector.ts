import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date | null | undefined): string | null {
  if (date == null) return null;
  return date.toISOString();
}
export namespace ShoppingMallSaleSnapshotCollector {
  export async function collect(props: {
    body: IShoppingMallSaleSnapshot.ICreate & {
      title: string;
      description: string;
      categoryId: string;
      basePrice: number;
    };
    sale: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      title: props.body.title,
      description: props.body.description,
      category_id: props.body.categoryId,
      base_price: props.body.basePrice,
      created_at: toISOStringSafe(new Date())!,
      updated_at: toISOStringSafe(new Date())!,
      deleted_at: null,
      sale: { connect: { id: props.sale.id } },
    } satisfies Prisma.shopping_mall_sale_snapshotsCreateInput;
  }
}
