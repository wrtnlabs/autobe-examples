import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_admin_detail_view(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const seller = await api.functional.mallPlatform.administrator.sellers.at(
    adminConnection,
    { sellerId },
  );
  typia.assert(seller);
  TestValidator.equals("seller id", seller.id, sellerId);
  TestValidator.predicate("seller email is present", seller.email.length > 0);
  TestValidator.predicate(
    "seller status is present",
    seller.status.status === "pending" ||
      seller.status.status === "approved" ||
      seller.status.status === "rejected",
  );
  TestValidator.equals(
    "seller rejection reason consistency",
    seller.status.rejectionReason,
    seller.rejectionReason,
  );
  TestValidator.predicate(
    "seller profile has shop name",
    seller.sellerProfile.shopName.length > 0,
  );
  TestValidator.predicate(
    "seller profile has shop description",
    seller.sellerProfile.shopDescription.length > 0,
  );
  TestValidator.predicate(
    "seller profile logo uri is nullable string or null",
    seller.sellerProfile.logoImageUri === null ||
      seller.sellerProfile.logoImageUri.length > 0,
  );
  TestValidator.equals(
    "seller profile seller account link",
    seller.sellerProfile.sellerAccount.id,
    seller.id,
  );
  TestValidator.equals(
    "seller profile seller email link",
    seller.sellerProfile.sellerAccount.email,
    seller.email,
  );
  TestValidator.equals(
    "seller profile seller status link",
    seller.sellerProfile.sellerAccount.status,
    seller.status.status,
  );
  TestValidator.equals(
    "seller profile rejection reason link",
    seller.sellerProfile.sellerAccount.rejectionReason,
    seller.status.rejectionReason,
  );
  TestValidator.equals(
    "seller detail is stable across repeated fetches",
    seller,
    await api.functional.mallPlatform.administrator.sellers.at(
      adminConnection,
      {
        sellerId,
      },
    ),
  );
}
