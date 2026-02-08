import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(date: Date): string {
  return date.toISOString();
}
export namespace ShoppingMallProductVariantCollector {
  export async function collect(props: {
    body: IShoppingMallProductVariant.ICreate;
    product: IEntity;
  }) {
    const id: string = v4();
    // Insufficient information about properties of ICreate to map here
    throw new Error(
      "Missing information: Need properties of IShoppingMallProductVariant.ICreate type to correctly assign properties.",
    );
  }
}
