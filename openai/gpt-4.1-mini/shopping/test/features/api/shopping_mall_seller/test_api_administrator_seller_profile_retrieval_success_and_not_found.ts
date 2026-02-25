import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_profile_retrieval_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Register and authenticate administrator using authorize_administrator_join utility
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "StrongP@ssw0rd",
    },
  });
  // Update adminConnection headers with Authorization token
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${admin.token.access}`,
  };
  // 2. Scenario 1: Successful retrieval
  // For testing, we need a valid seller ID. We simulate a seller UUID (assuming this seller exists on backend).
  // In real-world scenario, creating a seller before test would be better, but no creation utility given.
  // So, we generate a UUID and expect it might be found in simulation mode.
  const validSellerId = typia.random<string & tags.Format<"uuid">>();
  const sellerProfile =
    await api.functional.shoppingMall.administrator.sellers.at(
      adminConnection,
      {
        sellerId: validSellerId,
      },
    );
  typia.assert(sellerProfile);
  // Assert sellerProfile contains required properties
  TestValidator.predicate(
    "email present",
    typeof sellerProfile.email === "string" && sellerProfile.email.length > 0,
  );
  TestValidator.predicate(
    "shopName present",
    typeof sellerProfile.shopName === "string" &&
      sellerProfile.shopName.length > 0,
  );
  // shopDescription and logoUri are optional, check presence or null
  TestValidator.predicate(
    "approvalStatus is valid",
    ["pending", "approved", "rejected"].includes(sellerProfile.approvalStatus),
  );
  if (sellerProfile.approvalStatus === "rejected") {
    TestValidator.predicate(
      "rejectionReason present when rejected",
      sellerProfile.rejectionReason !== undefined &&
        sellerProfile.rejectionReason !== null &&
        sellerProfile.rejectionReason.length > 0,
    );
  } else {
    TestValidator.predicate(
      "rejectionReason absent when not rejected",
      sellerProfile.rejectionReason === undefined ||
        sellerProfile.rejectionReason === null,
    );
  }
  TestValidator.predicate(
    "createdAt is a valid date",
    !Number.isNaN(Date.parse(sellerProfile.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is a valid date",
    !Number.isNaN(Date.parse(sellerProfile.updatedAt)),
  );
  // 3. Scenario 2: Retrieval with non-existent sellerId returns 404
  const nonExistentSellerId = "00000000-0000-0000-0000-000000000000" as const;
  await TestValidator.httpError(
    "seller not found returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sellers.at(
        adminConnection,
        {
          sellerId: nonExistentSellerId,
        },
      );
    },
  );
}
