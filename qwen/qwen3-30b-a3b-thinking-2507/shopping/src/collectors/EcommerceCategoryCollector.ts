import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";


export namespace EcommerceCategoryCollector {
    export async function collect(props: {
        body: IEcommerceCategory.ICreate;
    }) {
        const id = v4();
        return {
            id,
            name: ",,
            description: ",,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            parent: undefined,
        } satisfies Prisma.ecommerce_categoriesCreateInput;
    }
}