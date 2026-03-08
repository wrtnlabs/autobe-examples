import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_unban_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a test seller entity with banned status
  // Note: Cannot create via API as create/ban endpoints not available
  const seller: IEcommerceMallSeller = typia.random<IEcommerceMallSeller>();
  typia.assert(seller);
  // Force the seller to be banned for testing
  seller.is_banned = true;
  // 3. Unban the seller
  const unbannedSeller = await api.functional.ecommerceMall.admin.sellers.unban(
    adminConnection,
    { sellerId: seller.id },
  );
  typia.assert(unbannedSeller);
  // 4. Validate unban response
  TestValidator.equals("seller is unbanned", unbannedSeller.is_banned, false);
  TestValidator.equals("seller ID unchanged", unbannedSeller.id, seller.id);
  TestValidator.equals(
    "seller email unchanged",
    unbannedSeller.email,
    seller.email,
  );
  TestValidator.predicate(
    "updated_at is newer",
    new Date(unbannedSeller.updated_at) > new Date(seller.updated_at),
  );
  // 5. Verify seller retains other properties
  TestValidator.equals(
    "approval status unchanged",
    unbannedSeller.approval_status,
    seller.approval_status,
  );
  TestValidator.equals(
    "is_suspended unchanged",
    unbannedSeller.is_suspended,
    seller.is_suspended,
  );
}
