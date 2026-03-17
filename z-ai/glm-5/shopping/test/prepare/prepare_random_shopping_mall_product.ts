import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
export function prepare_random_shopping_mall_product(input?: DeepPartial<IShoppingMallProduct.ICreate>): IShoppingMallProduct.ICreate {
    return {
        name: input?.name ?? RandomGenerator.paragraph({ sentences: 3 }),
        description: input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
        categoryId: input?.categoryId ?? typia.random<string & tags.Format<"uuid">>(),
        basePrice: input?.basePrice ?? typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    };
}