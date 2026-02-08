import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSaleCollector {
  export async function collect(props: {
    body: IShoppingMallSale.ICreate;
    seller: IEntity;
  }) {
    const id = v4();
    // The DTO ICreate is empty; required scalar fields are missing in the DTO.
    // We cannot assign props.body.name or other missing fields as they don't exist.
    // Therefore cannot produce a valid Prisma CreateInput without user input or DTO extension.
    throw new Error(
      "Missing required fields in IShoppingMallSale.ICreate DTO: name, description, base_price, status, categoryId",
    );
  }
}
