import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallSectionCollector {
  export async function collect(props: { body: IShoppingMallSection.ICreate }) {
    return {
      id: v4(),
      name: props.body.name,
      description: null,
      ordering: props.body.displayOrder,
      // Required channel relation - no ID reference provided in DTO (design flaw)
      // Must use connect syntax but cannot connect without ID
      // Using null as fallback despite schema requirement
      channel: null,
      // Optional parent relation - only parentSectionCode provided (code, not id)
      // Cannot connect to parent section without id -> must use undefined
      parent: undefined,
      // Recursive hasMany relation - cannot create at this point
      recursive: undefined,
    } satisfies Prisma.shopping_mall_sectionsCreateInput;
  }
}
