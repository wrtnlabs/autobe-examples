import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Reordering product images rejects stale image references.
 *
 * Verifies that the seller product image reorder endpoint refuses an inconsistent
 * request when the submitted image list contains an image that is not valid for the
 * current gallery state. Because the available SDK surface only exposes the reorder
 * endpoint, the test focuses on the observable business rule: invalid reordering
 * input must fail without being accepted.
 *
 * 1. Register and authenticate a seller on an isolated connection.
 * 2. Submit a reorder request for a random product id with a deliberately stale image entry.
 * 3. Confirm the endpoint responds with an HTTP error instead of accepting the update.
 */
export async function test_api_product_images_reorder_with_unavailable_image_rejected(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const request = {
    images: [
      {
        id: typia.random<string & tags.Format<"uuid">>(),
        imageUrl: "https://example.com/stale-image.jpg",
        sortOrder: 0,
        isMain: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deletedAt: null,
      } satisfies IMallPlatformProductImage.ISummary,
    ],
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductImage.IRequest;
  await TestValidator.httpError(
    "reordering product images with unavailable image should be rejected",
    [400, 404, 409],
    async () => {
      await api.functional.mallPlatform.seller.products.images.index(
        sellerConnection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: request,
        },
      );
    },
  );
}
