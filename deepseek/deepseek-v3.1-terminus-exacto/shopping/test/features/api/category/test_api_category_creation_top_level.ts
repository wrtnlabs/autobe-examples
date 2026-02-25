import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { generate_random_ecommerce_administrator_categories_create } from "../../../generate/generate_random_ecommerce_administrator_categories_create";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function local_authorize_administrator_join(connection: api.IConnection, props: {
    body?: DeepPartial<IEcommerceAdministrator.IJoin>;
}): Promise<IEcommerceAdministrator.IAuthorized> {
    const joinInput = {
        email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
        password: props.body?.password ??
            (typia.random<string & tags.Format<"password">>() ||
                RandomGenerator.alphaNumeric(16)),
    } satisfies IEcommerceAdministrator.IJoin;
    return await api.functional.ecommerce.auth.administrator.join(connection, {
        body: joinInput,
    });
}

export async function test_api_category_creation_top_level(connection: api.IConnection): Promise<void> {
    // Create administrator connection and authenticate
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuth = await local_authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: "Password123!",
        },
    });
    typia.assert(adminAuth);
    // Step 1: Create a top-level category
    const categoryBody = {
        name: "Electronics",
        description: "Electronic devices and accessories",
    } satisfies IEcommerceCategory.ICreate;
    const createdCategory = await api.functional.ecommerce.administrator.categories.create(adminConnection, { body: categoryBody });
    typia.assert(createdCategory);
    // Step 2: Validate category creation response
    TestValidator.equals("category name", createdCategory.name, "Electronics");
    TestValidator.equals("category description", createdCategory.description, "Electronic devices and accessories");
    TestValidator.equals("parent category id should be null", createdCategory.parent_category_id, null);
    TestValidator.equals("parent category object should be null", createdCategory.parent, null);
    // Step 3: Test category name uniqueness constraint
    await TestValidator.error("duplicate category name should fail", async () => {
        await api.functional.ecommerce.administrator.categories.create(adminConnection, { body: { name: "Electronics", description: "Another electronics category" } satisfies IEcommerceCategory.ICreate });
    });
}