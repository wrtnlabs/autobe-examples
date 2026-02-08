import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sale_image_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve sale image by administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join and get authorization
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: administrator.token.access,
  };
  // Use a random valid UUID
  const validImageId = typia.random<string & tags.Format<"uuid">>();
  // Scenario 1: Attempt to retrieve a sale image which may or may not exist.
  // Since creation API for sale images is not given, we only test retrieval with a random UUID.
  const saleImage =
    await api.functional.shoppingMall.administrator.sale_images.at(
      adminConnection,
      {
        imageId: validImageId,
      },
    );
  typia.assert(saleImage);

  // Scenario 2: Attempt to retrieve non-existent sale image
  await TestValidator.httpError(
    "non-existent sale image retrieval results in 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_images.at(
        adminConnection,
        {
          imageId: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
        },
      );
    },
  );

  // Scenario 3: Unauthenticated user attempts to retrieve sale image
  const noAuthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access returns 401 or 403",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.administrator.sale_images.at(
        noAuthConnection,
        {
          imageId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
