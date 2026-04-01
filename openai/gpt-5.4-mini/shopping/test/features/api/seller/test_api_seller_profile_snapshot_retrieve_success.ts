import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email:
        `${RandomGenerator.alphabets(8)}@test.com` satisfies string as string,
      password: RandomGenerator.alphaNumeric(12) satisfies string as string,
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const snapshotConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: seller.token.access,
    },
  };
  const sellerProfileId = seller.id;
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.seller.seller_profiles.snapshots.at(
      snapshotConnection,
      {
        sellerProfileId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot seller profile id",
    snapshot.sellerProfileId,
    sellerProfileId,
  );
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.predicate(
    "snapshot shop name exists",
    snapshot.shopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot shop description exists",
    snapshot.shopDescription.length >= 0,
  );
  TestValidator.predicate(
    "snapshot logo image uri nullable or uri-reference string",
    snapshot.logoImageUri === null || typeof snapshot.logoImageUri === "string",
  );
  TestValidator.predicate(
    "snapshot createdAt exists",
    snapshot.createdAt.length > 0,
  );
}
