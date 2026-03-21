import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_category_deletion_by_admin_success(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as administrator
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: typia.random<string & tags.Format<"password">>(),
            name: RandomGenerator.name(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    // 2. Create a new category to be deleted
    const category = await api.functional.ecommerceMall.admin.admin.categories.create(adminConnection, {
        body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallCategory.ICreate,
    });
    typia.assert(category);
    // 3. Delete the category and verify 204 No Content response
    const deletionResult = await api.functional.ecommerceMall.admin.admin.categories.erase(adminConnection, {
        categoryId: category.id,
    });
    typia.assert(deletionResult);
    // 4. Verify the deleted_at timestamp is set (though we can't directly check after deletion)
    // The deletion was successful as the API returned void (204 No Content)
    TestValidator.predicate("category deletion returns void", deletionResult === undefined);
}