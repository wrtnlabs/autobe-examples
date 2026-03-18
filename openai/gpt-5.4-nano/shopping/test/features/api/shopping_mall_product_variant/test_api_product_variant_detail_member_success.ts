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

export async function test_api_product_variant_detail_member_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});

  const authedConnection: api.IConnection = { host: connection.host };
  authedConnection.headers = { Authorization: authorized.token.access };

  let variant: IShoppingMallProductVariant | undefined;
  let productVariantId: string | undefined;

  for (let i = 0; i < 10; i++) {
    const candidateId = typia.random<string & tags.Format<"uuid">>();
    try {
      const output =
        await api.functional.shoppingMall.member.productVariants.at(
          authedConnection,
          { productVariantId: candidateId },
        );
      typia.assert(output);
      variant = output;
      productVariantId = candidateId;
      break;
    } catch {
      // Retry with another UUID
    }
  }

  if (!variant || !productVariantId) {
    throw new Error(
      "Failed to retrieve an existing IShoppingMallProductVariant via member access after retries",
    );
  }

  TestValidator.equals(
    "variant id matches requested productVariantId",
    variant.id,
    productVariantId,
  );

  TestValidator.predicate(
    "parent product identity fields are present",
    variant.product.code !== "" &&
      variant.product.name !== "" &&
      variant.product.category.id !== "" &&
      (() => {
        const seller = variant.product.seller as {
          code?: string;
          name?: string;
        };
        return seller.code !== "" && seller.name !== "";
      })(),
  );
}
