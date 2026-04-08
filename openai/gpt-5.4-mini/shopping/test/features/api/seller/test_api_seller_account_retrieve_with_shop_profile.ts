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

export async function test_api_seller_account_retrieve_with_shop_profile(
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
    {
      sellerId,
    },
  );
  typia.assert(seller);
  TestValidator.equals("seller id should match request", seller.id, sellerId);
  TestValidator.predicate(
    "seller email should be present",
    seller.email.length > 0,
  );
  TestValidator.predicate(
    "seller status should be present",
    seller.status.length > 0,
  );
  TestValidator.predicate(
    "rejection reason should be nullable",
    seller.rejectionReason === null || seller.rejectionReason.length >= 0,
  );
  TestValidator.predicate(
    "suspendedAt should be nullable",
    seller.suspendedAt === null || seller.suspendedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt should be nullable",
    seller.deletedAt === null || seller.deletedAt.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be present",
    seller.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt should be present",
    seller.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "seller profile should be included",
    seller.sellerProfile !== undefined && seller.sellerProfile !== null,
  );
  if (seller.sellerProfile) {
    TestValidator.equals(
      "seller profile owner id should match seller id",
      seller.sellerProfile.sellerAccount.id,
      seller.id,
    );
    TestValidator.equals(
      "seller profile owner email should match seller email",
      seller.sellerProfile.sellerAccount.email,
      seller.email,
    );
    TestValidator.predicate(
      "shop name should be present",
      seller.sellerProfile.shopName.length > 0,
    );
    TestValidator.predicate(
      "shop description should be present",
      seller.sellerProfile.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "logo image URI should be nullable",
      seller.sellerProfile.logoImageUri === null ||
        seller.sellerProfile.logoImageUri.length > 0,
    );
    TestValidator.predicate(
      "seller profile createdAt should be present",
      seller.sellerProfile.createdAt.length > 0,
    );
    TestValidator.predicate(
      "seller profile updatedAt should be present",
      seller.sellerProfile.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "seller profile deletedAt should be nullable",
      seller.sellerProfile.deletedAt === null ||
        seller.sellerProfile.deletedAt.length > 0,
    );
    TestValidator.predicate(
      "seller account summary approval status should be present",
      seller.sellerProfile.sellerAccount.approvalStatus.length > 0,
    );
  }
}
