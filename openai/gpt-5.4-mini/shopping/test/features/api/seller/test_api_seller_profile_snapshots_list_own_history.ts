import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function test_api_seller_profile_snapshots_list_own_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(12)}@test.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string &
        tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.seller.seller_profiles.snapshots.index(
      sellerConnection,
      {
        sellerProfileId: sellerAuth.id,
        body: request,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "snapshot pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot pagination limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list is sorted newest first by default",
    () =>
      response.data.every(
        (snapshot, index, array) =>
          index === 0 || array[index - 1]!.createdAt >= snapshot.createdAt,
      ),
  );
  TestValidator.predicate(
    "every snapshot belongs to the authenticated seller profile",
    () =>
      response.data.every(
        (snapshot) => snapshot.sellerProfileId === sellerAuth.id,
      ),
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
  }
  const anotherSellerConnection: api.IConnection = { host: connection.host };
  const anotherSellerAuth = await authorize_seller_join(
    anotherSellerConnection,
    {
      body: {
        email:
          `${RandomGenerator.alphaNumeric(12)}_other@test.com` satisfies string &
            tags.Format<"email">,
        password: RandomGenerator.alphaNumeric(12) satisfies string &
          tags.Format<"password">,
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
        ip: "127.0.0.1",
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(anotherSellerAuth);
  await TestValidator.httpError(
    "another seller cannot access this seller profile snapshot history",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.seller.seller_profiles.snapshots.index(
        anotherSellerConnection,
        {
          sellerProfileId: sellerAuth.id,
          body: request,
        },
      );
    },
  );
}
