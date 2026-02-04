import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
export function prepare_random_shopping_mall_configuration(input?: DeepPartial<IShoppingMallConfiguration.ICreate> | undefined): IShoppingMallConfiguration.ICreate {
    return {
        key: input?.key ?? (RandomGenerator.alphabets(typia.random<number>())) + (RandomGenerator.pick([true, false]) ? '-' + RandomGenerator.alphabets(typia.random<number>()) : ''),
        value: input?.value ?? RandomGenerator.paragraph({ sentences: typia.random<number>() }),
    };
}