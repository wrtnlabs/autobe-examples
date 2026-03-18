import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_image_get_member_not_found_nonexistent_id(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  const productImageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "nonexistent product image should return not found",
    404,
    async () => {
      await api.functional.shoppingMall.member.productImages.at(
        memberConnection,
        {
          productImageId,
        },
      );
    },
  );
  const productImageId2 = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "nonexistent product image should return not found consistently",
    404,
    async () => {
      await api.functional.shoppingMall.member.productImages.at(
        memberConnection,
        {
          productImageId: productImageId2,
        },
      );
    },
  );
}
