import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSalesPromoCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalesPromoCode";
import { prepare_random_shopping_mall_sales_promo_code } from "../../../prepare/prepare_random_shopping_mall_sales_promo_code";
import { generate_random_shopping_mall_admin_promo_codes_create } from "../../../generate/generate_random_shopping_mall_admin_promo_codes_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_promo_code_deletion_by_admin(connection: api.IConnection): Promise<void> {
    const adminConnection: api.IConnection = { host: connection.host };
    
    await authorize_admin_join(adminConnection, { body: {} });
    
    const promoCode = await generate_random_shopping_mall_admin_promo_codes_create(adminConnection, {
        body: {
            code: RandomGenerator.name(),
            discount_percentage: 10,
            expiry_date: new Date(Date.now() + 86400000).toISOString(),
            usage_limit: 5,
            max_usage: 10
        }
    });
    
    await api.functional.shoppingMall.admin.promo_codes.erase(adminConnection, { promoCodeId: promoCode.id });
}