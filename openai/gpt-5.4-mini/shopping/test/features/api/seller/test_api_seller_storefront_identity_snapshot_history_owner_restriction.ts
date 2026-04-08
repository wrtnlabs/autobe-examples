import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_storefront_identity_snapshot_history_owner_restriction(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const intruderConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: `${RandomGenerator.alphabets(12)}A1!`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: `${RandomGenerator.alphabets(12)}B2!`,
    } satisfies IMallPlatformSeller.IJoin,
  });
  await api.functional.mallPlatform.seller.storefront_identity.update(
    ownerConnection,
    {
      body: {
        shopName: `Owner Shop ${RandomGenerator.alphabets(6)}`,
        shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
        logoImageUri: null,
      } satisfies IMallPlatformSellerProfile.IUpdate,
    },
  );
  await api.functional.mallPlatform.seller.storefront_identity.update(
    ownerConnection,
    {
      body: {
        shopName: `Owner Shop ${RandomGenerator.alphabets(6)}`,
        shopDescription: RandomGenerator.paragraph({ sentences: 4 }),
        logoImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies IMallPlatformSellerProfile.IUpdate,
    },
  );
  await TestValidator.httpError(
    "non-owner seller cannot read storefront identity snapshot history",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.seller.storefront_identity.snapshots.index(
        intruderConnection,
        {
          body: {
            page: 1,
            limit: 10,
            order: "desc",
          } satisfies IMallPlatformSellerProfileSnapshot.IRequest,
        },
      );
    },
  );
}
