import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Retrieve profile snapshots with empty pagination request
  const snapshots =
    await api.functional.ecommerce.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // Validate pagination structure
  TestValidator.equals(
    "snapshots data array exists",
    Array.isArray(snapshots.data),
    true,
  );
  TestValidator.equals(
    "snapshots data array is empty",
    snapshots.data.length,
    0,
  );
  TestValidator.equals(
    "pagination exists",
    typeof snapshots.pagination,
    "object",
  );
  TestValidator.equals("current page", snapshots.pagination.current, 1);
  TestValidator.equals("limit", snapshots.pagination.limit, 10);
  TestValidator.equals("total records", snapshots.pagination.records, 0);
  TestValidator.equals("total pages", snapshots.pagination.pages, 0);
  TestValidator.predicate(
    "current is non-negative",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
}
