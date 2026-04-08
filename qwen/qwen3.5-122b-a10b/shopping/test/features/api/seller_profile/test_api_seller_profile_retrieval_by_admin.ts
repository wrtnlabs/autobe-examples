import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_profile_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate a random seller profile ID for the request
  const profileId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve seller profile by admin
  // Note: In simulation mode, this returns random valid data
  const profile = await api.functional.ecommerce.admin.profiles.at(
    adminConnection,
    {
      profileId,
    },
  );
  typia.assert(profile);
  // 4. Validate profile structure
  TestValidator.predicate("shop name exists", profile.shop_name.length > 0);
  // 5. Validate embedded seller summary
  TestValidator.predicate(
    "seller ID is UUID",
    /^[0-9a-f-]{36}$/i.test(profile.seller.id),
  );
  TestValidator.predicate(
    "seller approval status exists",
    ["pending", "approved", "rejected"].includes(
      profile.seller.approval_status,
    ),
  );
  TestValidator.predicate(
    "seller is_suspended is boolean",
    typeof profile.seller.is_suspended === "boolean",
  );
  TestValidator.predicate(
    "seller is_banned is boolean",
    typeof profile.seller.is_banned === "boolean",
  );
  TestValidator.predicate(
    "seller shop_name exists",
    profile.seller.shop_name.length > 0,
  );
}
