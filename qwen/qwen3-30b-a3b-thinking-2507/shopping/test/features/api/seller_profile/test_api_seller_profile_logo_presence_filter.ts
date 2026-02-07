import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfile";
export async function test_api_seller_profile_logo_presence_filter(connection: api.IConnection): Promise<void> {
    // Query with empty parameters (API applies logo presence logic server-side)
    const result = await api.functional.ecommerce.seller_profiles.index(connection, {
        body: {}
    });
    typia.assert(result);
    // Verify all returned profiles have non-null logo URLs
    for (const profile of result.data) {
        if (profile.logo_url == null) {
            throw new Error(`Seller profile with null/undefined logo URL found: ${profile.id}`);
        }
    }
}