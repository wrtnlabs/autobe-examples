import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IProductVariantAttributes } from "@ORGANIZATION/PROJECT-api/lib/structures/IProductVariantAttributes";
export function prepare_random_shopping_mall_product_variant(input?: DeepPartial<IShoppingMallProductVariant.ICreate>): IShoppingMallProductVariant.ICreate {
    return {
        // Generate a JSON string of attribute-value pairs with at least one attribute
        attributes: input?.attributes ?? (() => {
            const attributes = ['size', 'color', 'material', 'pattern', 'style', 'brand', 'model'];
            const result: Record<string, string> = {};
            // Ensure at least one attribute is selected
            const firstAttr = attributes[typia.random<number>() % attributes.length];
            result[firstAttr] = typia.random<string & tags.Format<'uuid'>>();
            // Randomly add 0-3 additional attributes
            attributes.filter(attr => attr !== firstAttr).forEach(attr => {
                if (typia.random<boolean>()) {
                    result[attr] = typia.random<string & tags.Format<'uuid'>>();
                }
            });
            return JSON.stringify(result);
        })(),
        // Generate positive price (minimum 1)
        price: input?.price ?? typia.random<number & tags.Type<'uint32'> & tags.Minimum<1>>(),
        // Generate non-negative quantity (0 or greater)
        quantity: input?.quantity ?? typia.random<number & tags.Type<'int32'> & tags.Minimum<0>>(),
    };
}