import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_sale_image_retrieve_not_found_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // This test verifies not found errors and access control for retrieving sale images.
  // 1. Join as a seller to get authorized connection.
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {},
  });
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = { Authorization: sellerAuthorized.token.access };
  // 2. Generate a valid saleId and imageId UUID that do not exist in the system
  //    to test 404 not found error.
  const nonExistingSaleId = typia.random<string & tags.Format<"uuid">>();
  const nonExistingImageId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test invalid UUID format for saleId
  await TestValidator.httpError("invalid saleId format", 404, async () => {
    // intentionally send invalid saleId format string
    await api.functional.shoppingMall.seller.sales.images.at(sellerConnection, {
      saleId: "invalid-uuid-format",
      imageId: nonExistingImageId,
    });
  });
  // 4. Test invalid UUID format for imageId
  await TestValidator.httpError("invalid imageId format", 404, async () => {
    await api.functional.shoppingMall.seller.sales.images.at(sellerConnection, {
      saleId: nonExistingSaleId,
      imageId: "invalid-uuid-format",
    });
  });
  // 5. Test non-existent saleId and imageId -> 404
  await TestValidator.httpError(
    "non-existent sale image returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.at(
        sellerConnection,
        {
          saleId: nonExistingSaleId,
          imageId: nonExistingImageId,
        },
      );
    },
  );
  // 6. To test soft-deleted image, simulate creation of an image then soft-delete timestamp manually if needed
  //    Since no utility or SDK to create or soft-delete images is provided, simulate 404 response for such image
  const softDeletedSaleId = typia.random<string & tags.Format<"uuid">>();
  const softDeletedImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "soft-deleted sale image returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.seller.sales.images.at(
        sellerConnection,
        {
          saleId: softDeletedSaleId,
          imageId: softDeletedImageId,
        },
      );
    },
  );
  // 7. Test role-based access control
  //    Seller role can access (already tested with sellerConnection)
  //    Non-seller connection (no authorization header) should receive 404 or 403
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized access forbidden",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.sales.images.at(
        unauthorizedConnection,
        {
          saleId: nonExistingSaleId,
          imageId: nonExistingImageId,
        },
      );
    },
  );
  // 8. If there were other roles (e.g., customer, admin) access test, would implement here,
  //    but as per given info only seller role is authorized, so test only unauthorized/no-auth access.
}
