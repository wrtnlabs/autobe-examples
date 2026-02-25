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
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_category_usage_statistics_authorization_enforcement(connection: api.IConnection): Promise<void> {
    // Create actor connections 
    const customerConnection: api.IConnection = { host: connection.host };
    const sellerConnection: api.IConnection = { host: connection.host };
    const superAdminConnection: api.IConnection = { host: connection.host };
    const adminConnection: api.IConnection = { host: connection.host };

    // Test 1: Unauthenticated access should return 401
    await TestValidator.httpError("unauthenticated access returns 401", 401, async () => {
        await api.functional.ecommerce.administrator.category_usage.at(connection);
    });

    // Test 2: Customer access should return 403
    const customerAuth = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            display_name: RandomGenerator.name(2),
            phone_number: RandomGenerator.mobile(),
        } satisfies IEcommerceCustomer.IJoin,
    });
    typia.assert(customerAuth);
    await TestValidator.httpError("customer access returns 403", 403, async () => {
        await api.functional.ecommerce.administrator.category_usage.at(customerConnection);
    });

    // Test 3: Seller access should return 403
    const sellerAuth = await authorize_seller_join(sellerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            shop_name: RandomGenerator.name(),
            shop_description: RandomGenerator.paragraph({ sentences: 2 }),
            logo_image_url: typia.random<string & tags.Format<"uri">>(),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSeller.IJoin,
    });
    typia.assert(sellerAuth);
    await TestValidator.httpError("seller access returns 403", 403, async () => {
        await api.functional.ecommerce.administrator.category_usage.at(sellerConnection);
    });

    // Test 4: Super Administrator access should succeed
    const superAdminAuth = await authorize_super_administrator_join(superAdminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
            ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IEcommerceSuperAdministrator.IJoin,
    });
    typia.assert(superAdminAuth);
    const superAdminCategories = await api.functional.ecommerce.administrator.category_usage.at(superAdminConnection);
    typia.assert(superAdminCategories);

    // Test 5: Regular Administrator access should succeed
    const adminAuth = await authorize_administrator_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceAdministrator.IJoin,
    });
    typia.assert(adminAuth);
    const adminCategories = await api.functional.ecommerce.administrator.category_usage.at(adminConnection);
    typia.assert(adminCategories);
}