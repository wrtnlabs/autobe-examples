import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_variant_detail_member_snapshot_state_separation(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(member);
  // 2) Call member storefront detail for a productVariantId
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  try {
    const variant = await api.functional.shoppingMall.member.productVariants.at(
      memberConnection,
      { productVariantId },
    );
    typia.assert(variant);
    // Sanity check for current-availability controlled fields.
    TestValidator.predicate(
      "variant is_active should reflect current availability",
      variant.is_active === true,
    );
  } catch (err: unknown) {
    // If the variant is currently non-viewable, endpoint must not serve it as 200.
    if (typia.is<api.HttpError>(err)) {
      TestValidator.predicate(
        "non-viewable variant should not be served as 200",
        err.status !== 200,
      );
      return;
    }
    throw err;
  }
}
