import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

export function prepare_random_shopping_mall_product(input?: DeepPartial<IShoppingMallProduct.ICreate>): IShoppingMallProduct.ICreate {
    const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    return {
        name: input?.name ?? RandomGenerator.paragraph({
            sentences: randomInt(1, 3)
        }),
        description: input?.description ?? RandomGenerator.content({
            paragraphs: randomInt(2, 4)
        }),
        price: input?.price ?? (randomInt(1, 99999) / 100),
        category_id: input?.category_id ?? typia.random<string & tags.Format<'uuid'>>()
    };
}