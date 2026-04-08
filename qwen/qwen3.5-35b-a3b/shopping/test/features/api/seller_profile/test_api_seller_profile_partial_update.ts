import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApprovalRequest";
import type { IEcommerceMallShopProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfile";
import type { IEcommerceMallShopProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShopProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and login admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123!",
    },
  });
  typia.assert(admin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: "admin123!",
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Register seller account with pending approval
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerDisplay = RandomGenerator.name(2);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      display_name: sellerDisplay,
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // 3. Admin approves seller registration
  const approvalResponse =
    await api.functional.ecommerceMall.administrator.seller_approvals.update(
      adminLoginConnection,
      {
        requestId: seller.id,
        body: {
          status: "approved",
          rejection_reason: "",
        },
      },
    );
  typia.assert(approvalResponse);
  // 4. Seller login after approval
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  // 5. First partial update - only shop_name
  const firstShopName = RandomGenerator.name(2);
  const profileFirst =
    await api.functional.ecommerceMall.seller.seller_profile.update(
      sellerLoginConnection,
      {
        body: {
          shop_name: firstShopName,
        },
      },
    );
  typia.assert(profileFirst);
  // Verify shop_name updated, others unchanged (should be empty/default)
  TestValidator.equals(
    "shop_name updated",
    profileFirst.shop_name,
    firstShopName,
  );
  TestValidator.equals(
    "shop_description unchanged (null)",
    profileFirst.shop_description,
    null,
  );
  TestValidator.equals(
    "logo_url unchanged (null)",
    profileFirst.logo_url,
    null,
  );
  TestValidator.equals(
    "snapshot count after first update",
    profileFirst.snapshots.length,
    1,
  );
  const firstSnapshot = profileFirst.snapshots[0];
  TestValidator.equals(
    "first snapshot shop_name (empty)",
    firstSnapshot.shop_name,
    "",
  );
  TestValidator.equals(
    "first snapshot description (null)",
    firstSnapshot.shop_description,
    null,
  );
  TestValidator.equals(
    "first snapshot logo (null)",
    firstSnapshot.logo_url,
    null,
  );
  // 6. Second partial update - only shop_description
  const secondShopDescription = RandomGenerator.paragraph({ sentences: 2 });
  const profileSecond =
    await api.functional.ecommerceMall.seller.seller_profile.update(
      sellerLoginConnection,
      {
        body: {
          shop_description: secondShopDescription,
        },
      },
    );
  typia.assert(profileSecond);
  // Verify shop_description updated, others preserved
  TestValidator.equals(
    "shop_name preserved",
    profileSecond.shop_name,
    firstShopName,
  );
  TestValidator.equals(
    "shop_description updated",
    profileSecond.shop_description,
    secondShopDescription,
  );
  TestValidator.equals(
    "logo_url unchanged (null)",
    profileSecond.logo_url,
    null,
  );
  TestValidator.equals(
    "snapshot count after second update",
    profileSecond.snapshots.length,
    2,
  );
  const secondSnapshot = profileSecond.snapshots[1];
  TestValidator.equals(
    "second snapshot shop_name (from first update)",
    secondSnapshot.shop_name,
    firstShopName,
  );
  TestValidator.equals(
    "second snapshot description (empty)",
    secondSnapshot.shop_description,
    "",
  );
  TestValidator.equals(
    "second snapshot logo (null)",
    secondSnapshot.logo_url,
    null,
  );
  // 7. Third partial update - only logo_url
  const logoUrl = "https://example.com/shop-logo.png";
  const profileThird =
    await api.functional.ecommerceMall.seller.seller_profile.update(
      sellerLoginConnection,
      {
        body: {
          logo_url: logoUrl,
        },
      },
    );
  typia.assert(profileThird);
  // Verify logo_url updated, others preserved
  TestValidator.equals(
    "shop_name preserved",
    profileThird.shop_name,
    profileSecond.shop_name,
  );
  TestValidator.equals(
    "shop_description preserved",
    profileThird.shop_description,
    profileSecond.shop_description,
  );
  TestValidator.equals("logo_url updated", profileThird.logo_url, logoUrl);
  TestValidator.equals(
    "snapshot count after third update",
    profileThird.snapshots.length,
    3,
  );
  const thirdSnapshot = profileThird.snapshots[2];
  TestValidator.equals(
    "third snapshot shop_name (from second update)",
    thirdSnapshot.shop_name,
    profileSecond.shop_name,
  );
  TestValidator.equals(
    "third snapshot description (from second update)",
    thirdSnapshot.shop_description,
    profileSecond.shop_description,
  );
  TestValidator.equals(
    "third snapshot logo (null)",
    thirdSnapshot.logo_url,
    null,
  );
}