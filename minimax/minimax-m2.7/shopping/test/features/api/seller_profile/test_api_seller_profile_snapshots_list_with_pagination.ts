import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshots_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account with pending approval status
  const sellerConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/seller/register",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(registeredSeller);
  // 2. Update the seller's shop profile to create the first snapshot
  const firstProfileUpdate =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(firstProfileUpdate);
  // 3. Update the shop profile again with different values to create a second snapshot
  const secondProfileUpdate =
    await api.functional.ecommerceMall.seller.seller.profile.update(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerProfile.IUpdate,
      },
    );
  typia.assert(secondProfileUpdate);
  // 4. Call PATCH /ecommerceMall/seller/seller-profile-snapshots with pagination parameters
  const snapshotsResponse =
    await api.functional.ecommerceMall.seller.seller_profile_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IEcommerceMallSellerProfileSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 5. Verify response returns paginated results with total count >= 2
  TestValidator.predicate(
    "snapshots total count >= 2",
    snapshotsResponse.pagination.records >= 2,
  );
  // 6. Verify each snapshot contains required fields (id, shop_name, shop_description, logo_url, created_at)
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    TestValidator.equals(
      "snapshot has shop_name",
      snapshot.shop_name !== undefined && snapshot.shop_name !== null,
      true,
    );
    TestValidator.equals(
      "snapshot has shop_description",
      snapshot.shop_description !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has logo_url",
      snapshot.logo_url !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has created_at",
      snapshot.created_at !== undefined && snapshot.created_at !== null,
      true,
    );
  }
  // 7. Verify snapshots are ordered by created_at in descending order (newest first)
  if (snapshotsResponse.data.length >= 2) {
    const firstCreatedAt = new Date(
      snapshotsResponse.data[0].created_at,
    ).getTime();
    const secondCreatedAt = new Date(
      snapshotsResponse.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "snapshots ordered by created_at descending (newest first)",
      firstCreatedAt >= secondCreatedAt,
    );
  }
  // 8. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page is 1",
    snapshotsResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    snapshotsResponse.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    snapshotsResponse.pagination.pages >= 1,
  );
}
