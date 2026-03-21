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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_admin_seller_view_approval_statuses(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register multiple sellers (all start with "pending" status)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller1);
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2 = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller2);
  const seller3Connection: api.IConnection = { host: connection.host };
  const seller3 = await authorize_seller_join(seller3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller3);
  // 3. Admin views each seller has details including approval_status
  const adminViewConnection: api.IConnection = {
    host: connection.host,
    headers: adminConnection.headers,
  };
  const seller1View = await api.functional.ecommerceMall.admin.sellers.at(
    adminViewConnection,
    {
      sellerId: seller1.id,
    },
  );
  typia.assert(seller1View);
  const seller2View = await api.functional.ecommerceMall.admin.sellers.at(
    adminViewConnection,
    {
      sellerId: seller2.id,
    },
  );
  typia.assert(seller2View);
  const seller3View = await api.functional.ecommerceMall.admin.sellers.at(
    adminViewConnection,
    {
      sellerId: seller3.id,
    },
  );
  typia.assert(seller3View);
  // 4. Validate all newly registered sellers have "pending" approval status
  TestValidator.equals(
    "seller1 has pending status",
    seller1View.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller2 has pending status",
    seller2View.approval_status,
    "pending",
  );
  TestValidator.equals(
    "seller3 has pending status",
    seller3View.approval_status,
    "pending",
  );
  // 5. Validate seller view response structure includes required fields
  TestValidator.equals("seller1 id matches", seller1View.id, seller1.id);
  TestValidator.equals("seller2 id matches", seller2View.id, seller2.id);
  TestValidator.equals("seller3 id matches", seller3View.id, seller3.id);
  // 6. Validate created_at timestamps are present and valid
  TestValidator.predicate(
    "seller1 has valid created_at",
    seller1View.created_at.length > 0,
  );
  TestValidator.predicate(
    "seller2 has valid created_at",
    seller2View.created_at.length > 0,
  );
  TestValidator.predicate(
    "seller3 has valid created_at",
    seller3View.created_at.length > 0,
  );
  // 7. Validate profile fields exist (may be empty for pending sellers without profile)
  TestValidator.predicate(
    "seller1 profile exists",
    seller1View.profile !== undefined,
  );
  TestValidator.predicate(
    "seller2 profile exists",
    seller2View.profile !== undefined,
  );
  TestValidator.predicate(
    "seller3 profile exists",
    seller3View.profile !== undefined,
  );
}
