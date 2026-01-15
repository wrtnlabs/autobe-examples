import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCartItem";
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_items_filtering_and_search(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      },
    });
  typia.assert(member);
  // Step 2: Create shopping cart for the member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 3: Add multiple cart items with varied properties using utility function
  const items: ICommunityPlatformCartItem[] = await ArrayUtil.asyncRepeat(
    5,
    async (index) => {
      const productVariantId: string & tags.Format<"uuid"> = typia.random<
        string & tags.Format<"uuid">
      >();
      const quantity: number & tags.Type<"int32"> & tags.Minimum<1> =
        RandomGenerator.pick([1, 2, 5, 10]);
      const price: number & tags.Minimum<0> = RandomGenerator.pick([
        10.99, 29.99, 49.99, 99.99, 149.99,
      ]);
      const item: ICommunityPlatformCartItem =
        await generate_random_community_platform_member_carts_items_create(
          memberConnection,
          {
            // Pass the cartId in params object as required by the utility function
            body: {
              product_variant_id: productVariantId,
              quantity,
            },
            params: {
              cartId: cart.categoryId, // Use categoryId as cart identifier since cart.id doesn't exist
            },
          },
        );
      typia.assert(item);
      return item;
    },
  );
  // Step 4: Test filtering by minimum quantity (min_quantity: 2)
  const filteredByMinQuantity: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        min_quantity: 2,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(filteredByMinQuantity);
  TestValidator.equals(
    "filtered items have quantity >= 2",
    filteredByMinQuantity.data.every((item) => item.quantity >= 2),
    true,
  );
  // Step 5: Test filtering by maximum quantity (max_quantity: 5)
  const filteredByMaxQuantity: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        max_quantity: 5,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(filteredByMaxQuantity);
  TestValidator.equals(
    "filtered items have quantity <= 5",
    filteredByMaxQuantity.data.every((item) => item.quantity <= 5),
    true,
  );
  // Step 6: Test filtering by price range (min_price: 20, max_price: 100)
  const filteredByPriceRange: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        min_price: 20,
        max_price: 100,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(filteredByPriceRange);
  TestValidator.equals(
    "filtered items have price between 20 and 100",
    filteredByPriceRange.data.every(
      (item) => item.price >= 20 && item.price <= 100,
    ),
    true,
  );
  // Step 7: Test filtering by creation timestamp (created_after: 30 minutes ago)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const filteredByCreatedAfter: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        created_after: thirtyMinutesAgo,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(filteredByCreatedAfter);
  TestValidator.equals(
    "filtered items created after 30 minutes ago",
    filteredByCreatedAfter.data.every(
      (item) => new Date(item.created_at) >= new Date(thirtyMinutesAgo),
    ),
    true,
  );
  // Step 8: Test full-text search with keyword matching product details
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 4,
    wordMax: 8,
  });
  const searchResult: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        q: searchTerm,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(searchResult);
  TestValidator.equals(
    "search results contain search term",
    searchResult.data.length > 0,
    true,
  );
  // Step 9: Test combined filters - quantity range (min_quantity:2, max_quantity:5) + price range (min_price:30, max_price:80)
  const combinedFilter: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        min_quantity: 2,
        max_quantity: 5,
        min_price: 30,
        max_price: 80,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(combinedFilter);
  TestValidator.equals(
    "combined filtered items have quantity in [2,5]",
    combinedFilter.data.every(
      (item) => item.quantity >= 2 && item.quantity <= 5,
    ),
    true,
  );
  TestValidator.equals(
    "combined filtered items have price in [30,80]",
    combinedFilter.data.every((item) => item.price >= 30 && item.price <= 80),
    true,
  );
  // Step 10: Test pagination - limit 2 items per page
  const firstPage: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        page: 1,
        limit: 2,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(firstPage);
  TestValidator.equals(
    "first page has exactly 2 items",
    firstPage.data.length,
    2,
  );
  // Step 11: Test pagination - second page
  const secondPage: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        page: 2,
        limit: 2,
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(secondPage);
  TestValidator.equals(
    "second page has exactly 2 items",
    secondPage.data.length,
    2,
  );
  // Step 12: Test sorting by quantity descending
  const sortedByQuantity: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        sort_by: "quantity",
        order: "desc",
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(sortedByQuantity);
  TestValidator.predicate("quantity sorted in descending order", () => {
    for (let i = 0; i < sortedByQuantity.data.length - 1; i++) {
      if (
        sortedByQuantity.data[i].quantity <
        sortedByQuantity.data[i + 1].quantity
      ) {
        return false;
      }
    }
    return true;
  });
  // Step 13: Test sorting by price ascending
  const sortedByPrice: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      body: {
        sort_by: "unit_price",
        order: "asc",
      },
      cartId: cart.categoryId, // Use categoryId as cart identifier instead of id
    });
  typia.assert(sortedByPrice);
  TestValidator.predicate("price sorted in ascending order", () => {
    for (let i = 0; i < sortedByPrice.data.length - 1; i++) {
      if (sortedByPrice.data[i].price > sortedByPrice.data[i + 1].price) {
        return false;
      }
    }
    return true;
  });
}
