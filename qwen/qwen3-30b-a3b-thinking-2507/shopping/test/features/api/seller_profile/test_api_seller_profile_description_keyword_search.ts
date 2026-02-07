import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_description_keyword_search(
  connection: api.IConnection,
): Promise<void> {
  const searchValidator = TestValidator.search(
    "handmade description keyword search",
    async (keyword) => {
      const res = await api.functional.ecommerce.seller_profiles.index(
        connection,
        {
          body: { q: keyword } as IEcommerceSellerProfile.IRequest,
        },
      );
      return res.data;
    },
    [] as IEcommerceSellerProfile.ISummary[],
    5,
  );
  await searchValidator({
    fields: ["shop_description"],
    values: (seller) => [seller.shop_description ?? ""],
    filter: (seller, [description]) => description?.includes("handmade"),
    request: ([keyword]) => ({ q: keyword }),
  });
}
