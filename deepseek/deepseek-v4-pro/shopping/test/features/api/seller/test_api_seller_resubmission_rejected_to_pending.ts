import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_resubmission_rejected_to_pending(
    connection: api.IConnection,
): Promise<void> {
    // 1. Register a seller account with known credentials
    const email = typia.random<string & tags.Format<"email">>();
    const password = RandomGenerator.alphaNumeric(16);

    const joinConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(joinConnection, {
        body: { email, password },
    });
    typia.assert(seller);

    // 2. Authenticate the seller via login to obtain session tokens
    const sellerConnection: api.IConnection = { host: connection.host };
    const loggedInSeller = await authorize_seller_login(sellerConnection, {
        body: {
            email,
            password,
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IShoppingMallSeller.ILogin,
    });
    typia.assert(loggedInSeller);

    // 3. Capture pre-resubmission state for identity and timestamp validation
    const beforeUpdatedAt = loggedInSeller.updated_at;
    const sellerId = loggedInSeller.id;
    const sellerEmail = loggedInSeller.email;
    const sellerProfile = loggedInSeller.profile;

    // 4. Resubmit the seller registration for administrator review
    const resubmitted =
        await api.functional.shoppingMall.seller.resubmission.resubmit(
            sellerConnection,
        );
    typia.assert(resubmitted);

    // 5. Validate the resubmission transformed the seller state correctly
    TestValidator.equals(
        "approval_status changed to pending",
        resubmitted.approval_status,
        "pending",
    );
    TestValidator.equals(
        "rejection_reason cleared to null",
        resubmitted.rejection_reason,
        null,
    );
    TestValidator.predicate(
        "updated_at is more recent after resubmission",
        resubmitted.updated_at > beforeUpdatedAt,
    );
    TestValidator.equals("seller id unchanged", resubmitted.id, sellerId);
    TestValidator.equals(
        "seller email unchanged",
        resubmitted.email,
        sellerEmail,
    );
    TestValidator.equals(
        "seller profile unchanged",
        resubmitted.profile,
        sellerProfile,
    );
}