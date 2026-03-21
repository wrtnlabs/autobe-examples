import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { prepare_random_ecommerce_mall_seller_approval } from "../../../prepare/prepare_random_ecommerce_mall_seller_approval";
import { generate_random_ecommerce_mall_admin_seller_approvals_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_approvals_create";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_access_to_any_seller_profile_snapshot(connection: api.IConnection): Promise<void> {
    // 1. Create seller account
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {});
    const sellerId: string = sellerAuth.id;
    // 2. Create admin account
    const adminConnection: api.IConnection = { host: connection.host };
    await authorize_admin_join(adminConnection, {});
    // 3. Admin approves seller registration
    const approval = await generate_random_ecommerce_mall_admin_seller_approvals_create(adminConnection, {
        body: {
            sellerId: sellerId,
            status: "approved" as const,
        },
    });
    typia.assert(approval);
    TestValidator.equals("approval status", approval.status, "approved");
    // 4. Seller logs in after approval
    const sellerLoginConnection: api.IConnection = { host: connection.host };
    await authorize_seller_login(sellerLoginConnection, {
        body: {
            email: sellerAuth.email,
            password: (await import("@nestia/e2e")).RandomGenerator.alphaNumeric(16),
            href: typia.random<string & import("typia").tags.Format<"uri">>(),
            referrer: typia.random<string & import("typia").tags.Format<"uri">>(),
        },
    });
    // 5. Seller updates profile to create a snapshot
    const updatedProfile = await api.functional.ecommerceMall.seller.seller.profile.update(sellerLoginConnection, {
        body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
    });
    typia.assert(updatedProfile);
    // 6. Admin retrieves the snapshot
    const snapshotListConnection: api.IConnection = { host: connection.host };
    await authorize_admin_login(snapshotListConnection, {
        body: {
            email: (await import("@nestia/e2e")).RandomGenerator.alphabets(8) + "@admin.com",
            password: (await import("@nestia/e2e")).RandomGenerator.alphaNumeric(16),
            href: typia.random<string & import("typia").tags.Format<"uri">>(),
            referrer: typia.random<string & import("typia").tags.Format<"uri">>(),
        },
    });
    // Get snapshots list to find the snapshot ID
    const snapshots = await api.functional.ecommerceMall.seller.profile.snapshots.at(snapshotListConnection, {
        snapshotId: sellerAuth.id as string & import("typia").tags.Format<"uuid">,
    });
    typia.assert(snapshots);
}