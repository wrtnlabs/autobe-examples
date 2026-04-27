import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
export async function test_api_category_filter_by_parent(connection: api.IConnection): Promise<void> {
    // 1. Join as customer
    const customerConnection: api.IConnection = { host: connection.host };
    await authorize_customer_join(customerConnection, {});
    // 2. Browse categories with parent_id = null (top-level only)
    const topLevelPage = await api.functional.eCommerceMall.customer.categories.index(customerConnection, {
        body: {
            parent_id: null,
        } satisfies IECommerceMallCategory.IRequest,
    });
    typia.assert(topLevelPage);
    // 3. Verify all returned categories have parent = null (top-level)
    for (const cat of topLevelPage.data) {
        TestValidator.equals("parent is null for top-level category", cat.parent, null);
    }
    // 4. If there&apos;s at least one top-level category, test subcategory filtering
    if (topLevelPage.data.length > 0) {
        const topCat = topLevelPage.data[0];
        // 5. Browse subcategories of this parent
        const subPage = await api.functional.eCommerceMall.customer.categories.index(customerConnection, {
            body: {
                parent_id: topCat.id,
            } satisfies IECommerceMallCategory.IRequest,
        });
        typia.assert(subPage);
        // 6. Verify all returned categories have parent.id matching the parent UUID
        for (const sub of subPage.data) {
            TestValidator.predicate(
                "subcategory has non-null parent when filtered by parent_id",
                sub.parent !== null,
            );
            const parent = typia.assert(sub.parent!);
            TestValidator.equals(
                "subcategory parent id matches filter",
                parent.id,
                topCat.id,
            );
            // 7. Verify subcategories have empty subcategories array (two-level constraint)
            TestValidator.equals(
                "subcategory has no children",
                sub.subcategories,
                [],
            );
        }
    }
    // 8. Test omitting parent_id entirely returns all categories (unfiltered)
    const allPage = await api.functional.eCommerceMall.customer.categories.index(customerConnection, {
        body: {} satisfies IECommerceMallCategory.IRequest,
    });
    typia.assert(allPage);
    // The unfiltered result should contain at least as many categories as top-level only
    TestValidator.predicate(
        "unfiltered results contain > top-level results",
        allPage.data.length > topLevelPage.data.length,
    );
}
